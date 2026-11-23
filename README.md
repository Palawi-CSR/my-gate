# My Gate

Records when a person goes out (check-out) and comes back (check-in), with a photo each time.

| Part | Stack | Folder |
| --- | --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 | [frontend/](frontend/) |
| Backend | Python 3.11, FastAPI, MongoDB (PyMongo async) | [backend/](backend/) |

## How it works

1. Fill in **name**, take or upload a **photo**, pick **Personal Work** or **Office Work**, press **Check out**.
   The out time is recorded and the entry is saved to MongoDB.
2. The entry appears under **Currently out** with a **Check in** button. Pressing it
   (optionally with a return photo) records the in time.
3. Returned entries show the out and in times, both photos, and how long the person was out.

Photos are stored in `backend/storage/photos/` (not in git; back it up with the database).

## Setup

Requires Node.js 20+, Python 3.11+ and a MongoDB database.

```bash
# Configuration: one .env in the project root, used by backend and frontend
copy .env.example .env          # then set MONGODB_URI and MONGODB_DB_NAME

# Backend
cd backend
py -3.11 -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

## Configuration (`.env` in the project root)

| Variable | Default | Used by | Purpose |
| --- | --- | --- | --- |
| `MONGODB_URI` | — (required) | backend | MongoDB connection string |
| `MONGODB_DB_NAME` | — (required) | backend | Database name |
| `API_PORT` | `8001` | both | Port the API listens on; the dev server forwards `/api` there |
| `CORS_ORIGINS` | `http://localhost:5180,…` | backend | Origins allowed to call the API |
| `WEB_PORT` | `5180` | frontend | Port for `npm run dev` |
| `VITE_API_BASE_URL` | empty | frontend | Production only: API origin if it is on another domain |

Only `VITE_*` variables are sent to the browser, so secrets like `MONGODB_URI` stay on the server.

## Run

```bash
# Terminal 1: API on http://localhost:8001 (docs at /docs)
backend\start.bat         # uses the project venv (Python 3.11) and port 8001

# Terminal 2: UI on http://localhost:5180
cd frontend
npm run dev
```

The Vite dev server forwards `/api` and `/files` to the API.

**On a phone:** connect it to the same Wi-Fi as this PC and open the "Network" address
`npm run dev` prints (e.g. `http://192.168.1.20:5180`). If it does not load, allow Node.js
through Windows Firewall for private networks. Live camera preview needs `localhost` or
HTTPS, so on a phone use **Upload**, which offers the phone's camera directly.

## API

| Method | Path | Body |
| --- | --- | --- |
| GET | `/api/visits` | query (all optional): `name` (part of name, any case), `start` / `end` (ISO time range of check-out) |
| POST | `/api/visits/check-out` | form: `name`, `purpose` (`Personal Work` / `Office Work`), `photo` |
| POST | `/api/visits/{id}/check-in` | form: `photo` (optional) |
