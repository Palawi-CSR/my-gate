"""My Gate API: record when a person goes out (check-out) and comes back (check-in).

Runs two ways with the same code:
- locally: `start.bat` / `python main.py` (uvicorn on API_PORT, settings from the root .env)
- on Vercel: imported by api/index.py as a serverless function (settings from Vercel env vars)

Photos are stored in MongoDB (collection `photos`), not on disk, because serverless hosts
have no persistent filesystem.
"""

import sys

if sys.version_info < (3, 10):
    sys.exit(
        f"My Gate needs Python 3.10+, but this is Python {sys.version.split()[0]}.\n"
        "Start it with start.bat, or: .venv\\Scripts\\python main.py"
    )

import re
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from bson import Binary, ObjectId
from bson.errors import InvalidId
from fastapi import FastAPI, File, Form, HTTPException, Query, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from pymongo import MongoClient, ReturnDocument
from pymongo.database import Database
from pymongo.errors import PyMongoError


class Settings(BaseSettings):
    # Locally: the project-root .env (shared with the frontend). On Vercel there is no
    # .env file; the same names are read from the project's Environment Variables.
    model_config = SettingsConfigDict(env_file=Path(__file__).resolve().parent.parent / ".env", extra="ignore")

    # Required.
    mongodb_uri: str = Field(min_length=1)
    mongodb_db_name: str = Field(min_length=1)
    # Only needed when the frontend is on a different origin (local dev uses Vite's proxy,
    # Vercel serves frontend and API from the same domain).
    cors_origins: str = "http://localhost:5180,http://127.0.0.1:5180"
    # Local only: 8000 is used by the Palawi CSR API; Vite's dev proxy reads the same value.
    api_port: int = 8001


settings = Settings()

# Vercel rejects request bodies over 4.5 MB; the browser shrinks photos to ~1280 px first.
MAX_PHOTO_BYTES = 4 * 1024 * 1024
PHOTO_TYPES = {"image/jpeg", "image/png", "image/webp"}

Purpose = Literal["Personal Work", "Office Work"]

# --- MongoDB ------------------------------------------------------------------------------
# Synchronous PyMongo: its client is thread-safe and not tied to an event loop, so one
# client is safely reused across requests and across warm serverless invocations.
# Created on first use (serverless platforms don't reliably run startup hooks).

_db: Database | None = None
_db_lock = threading.Lock()


def get_db() -> Database:
    global _db
    if _db is None:
        with _db_lock:
            if _db is None:
                # Small pool: each serverless instance gets its own client, and the free Atlas tier
                # allows ~500 connections in total.
                client = MongoClient(
                    settings.mongodb_uri, serverSelectionTimeoutMS=8000, maxPoolSize=10, tz_aware=True, appname="my-gate"
                )
                db = client[settings.mongodb_db_name]
                db.visits.create_index([("out_time", -1)])  # also verifies the connection
                _db = db
    return _db


# --- App ----------------------------------------------------------------------------------

app = FastAPI(title="My Gate API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(PyMongoError)
def database_error(_: Request, exc: PyMongoError):
    # Most common cause on Vercel: Atlas "Network Access" does not allow Vercel's IPs.
    print(f"MongoDB error: {exc!r}", file=sys.stderr)
    return JSONResponse(status_code=503, content={"detail": "Database is unreachable. Please try again shortly."})


def save_photo(photo: UploadFile) -> str:
    """Store an uploaded image in MongoDB and return the URL it is served at."""
    if (photo.content_type or "") not in PHOTO_TYPES:
        raise HTTPException(400, "Photo must be a JPEG, PNG or WebP image.")
    data = photo.file.read(MAX_PHOTO_BYTES + 1)
    if len(data) > MAX_PHOTO_BYTES:
        raise HTTPException(400, "Photo must be 4 MB or smaller.")
    if not data:
        raise HTTPException(400, "Photo is empty.")
    result = get_db().photos.insert_one(
        {"content_type": photo.content_type, "data": Binary(data), "created_at": datetime.now(timezone.utc)}
    )
    return f"/api/photos/{result.inserted_id}"


def delete_photo(url: str | None) -> None:
    if url and url.startswith("/api/photos/"):
        try:
            get_db().photos.delete_one({"_id": ObjectId(url.rsplit("/", 1)[-1])})
        except InvalidId:
            pass


def serialize(doc: dict) -> dict:
    def iso(dt: datetime | None) -> str | None:
        return dt.astimezone(timezone.utc).isoformat() if dt else None

    return {
        "id": str(doc["_id"]),
        "name": doc["name"],
        "purpose": doc["purpose"],
        "out_time": iso(doc["out_time"]),
        "out_photo": doc["out_photo"],
        "in_time": iso(doc.get("in_time")),
        "in_photo": doc.get("in_photo"),
    }


@app.get("/api/health")
def health():
    """Quick deployment check: is the API up and can it reach MongoDB?"""
    get_db().command("ping")
    return {"status": "ok", "database": settings.mongodb_db_name}


@app.get("/api/visits")
def list_visits(
    name: str | None = Query(None, max_length=100, description="Part of the name, any case"),
    start: datetime | None = Query(None, description="Only entries checked out at or after this time"),
    end: datetime | None = Query(None, description="Only entries checked out before this time"),
):
    """List entries, newest first. The frontend sends start/end as the local day's boundaries."""
    query: dict = {}
    if name and name.strip():
        query["name"] = {"$regex": re.escape(name.strip()), "$options": "i"}
    if start or end:
        query["out_time"] = {}
        if start:
            query["out_time"]["$gte"] = start
        if end:
            query["out_time"]["$lt"] = end
    return [serialize(doc) for doc in get_db().visits.find(query).sort("out_time", -1).limit(500)]


@app.post("/api/visits/check-out", status_code=201)
def check_out(
    name: str = Form(..., min_length=1, max_length=100),
    purpose: Purpose = Form(...),
    photo: UploadFile = File(...),
):
    name = name.strip()
    if not name:
        raise HTTPException(400, "Name is required.")
    doc = {
        "name": name,
        "purpose": purpose,
        "out_time": datetime.now(timezone.utc),
        "out_photo": save_photo(photo),
        "in_time": None,
        "in_photo": None,
    }
    result = get_db().visits.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize(doc)


@app.post("/api/visits/{visit_id}/check-in")
def check_in(visit_id: str, photo: UploadFile | None = File(None)):
    try:
        oid = ObjectId(visit_id)
    except InvalidId:
        raise HTTPException(404, "Entry not found.")
    in_photo = save_photo(photo) if photo and photo.filename else None
    visits = get_db().visits
    doc = visits.find_one_and_update(
        {"_id": oid, "in_time": None},
        {"$set": {"in_time": datetime.now(timezone.utc), "in_photo": in_photo}},
        return_document=ReturnDocument.AFTER,
    )
    if doc is None:
        delete_photo(in_photo)
        exists = visits.count_documents({"_id": oid}, limit=1)
        raise HTTPException(409 if exists else 404, "Already checked in." if exists else "Entry not found.")
    return serialize(doc)


@app.get("/api/photos/{photo_id}")
def get_photo(photo_id: str):
    try:
        doc = get_db().photos.find_one({"_id": ObjectId(photo_id)})
    except InvalidId:
        doc = None
    if doc is None:
        raise HTTPException(404, "Photo not found.")
    # Photos never change once stored, so browsers and Vercel's CDN may cache them for good.
    return Response(
        content=bytes(doc["data"]),
        media_type=doc["content_type"],
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


if __name__ == "__main__":
    # `python main.py` starts the API on the right port without extra flags.
    import uvicorn

    here = str(Path(__file__).parent)
    uvicorn.run("main:app", app_dir=here, reload_dirs=[here], host="127.0.0.1", port=settings.api_port, reload=True)
