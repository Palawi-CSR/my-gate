"""My Gate API: record when a person goes out (check-out) and comes back (check-in)."""

import sys

if sys.version_info < (3, 10):
    sys.exit(
        f"My Gate needs Python 3.10+, but this is Python {sys.version.split()[0]}.\n"
        "Start it with start.bat, or: .venv\\Scripts\\python main.py"
    )

import re
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
from uuid import uuid4

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from pymongo import AsyncMongoClient, ReturnDocument


class Settings(BaseSettings):
    # The project-root .env is shared with the frontend; the path is absolute so it is
    # found whichever folder the server is started from.
    model_config = SettingsConfigDict(env_file=Path(__file__).resolve().parent.parent / ".env", extra="ignore")

    # Required: set both in the root .env.
    mongodb_uri: str = Field(min_length=1)
    mongodb_db_name: str = Field(min_length=1)
    cors_origins: str = "http://localhost:5180,http://127.0.0.1:5180"
    # 8000 is used by the Palawi CSR API; the frontend's dev proxy reads the same API_PORT.
    api_port: int = 8001


settings = Settings()

PHOTO_DIR = Path(__file__).parent / "storage" / "photos"
PHOTO_DIR.mkdir(parents=True, exist_ok=True)
MAX_PHOTO_BYTES = 5 * 1024 * 1024
PHOTO_EXTENSIONS = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}

Purpose = Literal["Personal Work", "Office Work"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    client = AsyncMongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000, tz_aware=True)
    await client.admin.command("ping")  # fail fast if MongoDB is unreachable
    app.state.visits = client[settings.mongodb_db_name]["visits"]
    await app.state.visits.create_index([("out_time", -1)])
    yield
    await client.close()


app = FastAPI(title="My Gate API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/files/photos", StaticFiles(directory=PHOTO_DIR), name="photos")


async def save_photo(photo: UploadFile) -> str:
    ext = PHOTO_EXTENSIONS.get(photo.content_type or "")
    if not ext:
        raise HTTPException(400, "Photo must be a JPEG, PNG or WebP image.")
    data = await photo.read(MAX_PHOTO_BYTES + 1)
    if len(data) > MAX_PHOTO_BYTES:
        raise HTTPException(400, "Photo must be 5 MB or smaller.")
    if not data:
        raise HTTPException(400, "Photo is empty.")
    name = f"{uuid4().hex}{ext}"
    (PHOTO_DIR / name).write_bytes(data)
    return f"/files/photos/{name}"


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


@app.get("/api/visits")
async def list_visits(
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
    cursor = app.state.visits.find(query).sort("out_time", -1).limit(500)
    return [serialize(doc) async for doc in cursor]


@app.post("/api/visits/check-out", status_code=201)
async def check_out(
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
        "out_photo": await save_photo(photo),
        "in_time": None,
        "in_photo": None,
    }
    result = await app.state.visits.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize(doc)


@app.post("/api/visits/{visit_id}/check-in")
async def check_in(visit_id: str, photo: UploadFile | None = File(None)):
    try:
        oid = ObjectId(visit_id)
    except InvalidId:
        raise HTTPException(404, "Entry not found.")
    in_photo = await save_photo(photo) if photo and photo.filename else None
    doc = await app.state.visits.find_one_and_update(
        {"_id": oid, "in_time": None},
        {"$set": {"in_time": datetime.now(timezone.utc), "in_photo": in_photo}},
        return_document=ReturnDocument.AFTER,
    )
    if doc is None:
        if in_photo:
            (PHOTO_DIR / Path(in_photo).name).unlink(missing_ok=True)
        exists = await app.state.visits.count_documents({"_id": oid}, limit=1)
        raise HTTPException(409 if exists else 404, "Already checked in." if exists else "Entry not found.")
    return serialize(doc)


if __name__ == "__main__":
    # `python main.py` starts the API on the right port without extra flags.
    import uvicorn

    here = str(Path(__file__).parent)
    uvicorn.run("main:app", app_dir=here, reload_dirs=[here], host="127.0.0.1", port=settings.api_port, reload=True)
