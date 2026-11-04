import asyncio
from contextlib import suppress
from fastapi import FastAPI, APIRouter, HTTPException, Query, Request
from fastapi.responses import FileResponse, HTMLResponse
import html
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, IndexModel
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List
import uuid
from datetime import datetime, timedelta, timezone
import re


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# One entry per collection: every field a route filters, sorts or dedupes on. Add the index in the same edit as the query.
INDEXES: dict[str, list[IndexModel]] = {
    "status_checks": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("timestamp", DESCENDING)], name="timestamp_desc"),
    ],
    "presence": [
        IndexModel([("code", ASCENDING)], name="code", unique=True),
        IndexModel([("updated_at", ASCENDING)], name="updated_at_ttl", expireAfterSeconds=120),
    ],
}


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:  # one at a time so a bad spec skips only itself
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:  # never block boot on an index; the log line names what to fix
                logging.getLogger(__name__).error("ensure_indexes(%s.%s): %s", collection, model.document["name"], exc)

# Create the main app without a prefix
app = FastAPI()

# Probe endpoint for the deployer and pod health checks: root-level (not /api), no DB call.
@app.get("/health", include_in_schema=False)
@app.head("/health", include_in_schema=False)
async def health():
    return {"status": "ok"}

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks(limit: int = Query(20, ge=1, le=100)):
    status_checks = await db.status_checks.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return [StatusCheck(**status_check) for status_check in status_checks]

STAGE_HTML = ROOT_DIR / "stage.html"


# ---------- presence: "in attesa" status for codes the caller already knows ----------
class PresenceIn(BaseModel):
    code: str = Field(pattern=r"^\d{6}$")


@api_router.post("/presence")
async def presence_ping(body: PresenceIn):
    await db.presence.update_one({"code": body.code}, {"$set": {"code": body.code, "updated_at": datetime.now(timezone.utc)}}, upsert=True)
    return {"ok": True}


@api_router.delete("/presence/{code}")
async def presence_leave(code: str):
    if re.fullmatch(r"\d{6}", code):
        await db.presence.delete_one({"code": code})
    return {"ok": True}


@api_router.get("/presence")
async def presence_check(codes: str = Query("", max_length=200)):
    wanted = [c for c in codes.split(",") if re.fullmatch(r"\d{6}", c)][:20]
    if not wanted:
        return {"online": []}
    since = datetime.now(timezone.utc) - timedelta(seconds=45)
    docs = await db.presence.find({"code": {"$in": wanted}, "updated_at": {"$gte": since}}, {"_id": 0, "code": 1}).to_list(20)
    return {"online": [d["code"] for d in docs]}


@api_router.get("/stage", include_in_schema=False)
async def stage():
    """3D stage (WebRTC + three.js) embedded by the mobile app."""
    return FileResponse(STAGE_HTML, media_type="text/html", headers={"Cache-Control": "no-cache", "Content-Security-Policy": STAGE_CSP})


STAGE_CSP = (
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; "
    "connect-src 'self' https://0.peerjs.com wss://0.peerjs.com; img-src 'self' data: blob:; "
    "media-src 'self' blob: mediastream:; frame-ancestors 'self'; base-uri 'none'; form-action 'none'"
)
LIB_DIR = ROOT_DIR / "lib"
LIBS = {"three.min.js", "peerjs.min.js"}


@api_router.get("/lib/{name}", include_in_schema=False)
async def stage_lib(name: str):
    """Self-hosted copies of three.js 0.158.0 and PeerJS 1.5.4 (no third-party CDN at runtime)."""
    if name not in LIBS:
        raise HTTPException(status_code=404)
    return FileResponse(LIB_DIR / name, media_type="application/javascript", headers={"Cache-Control": "public, max-age=86400"})


JOIN_HTML = (ROOT_DIR / "join.html").read_text(encoding="utf-8")
EXPO_GO_HOST_SUFFIXES = (".emergentagent.com", ".emergent.host", ".emergent.sh")


def _allowed_app_base(base: str) -> bool:
    """Only this app's own scheme, or Expo Go links that point at Emergent preview hosts."""
    if base.startswith("frontend://"):
        return True
    if base.startswith(("exp://", "exps://")):
        host = base.split("://", 1)[1].split("/", 1)[0].split(":", 1)[0].lower()
        return host.endswith(EXPO_GO_HOST_SUFFIXES)
    return False


@api_router.get("/join", include_in_schema=False)
async def join(request: Request, code: str = Query(..., pattern=r"^\d{6}$"), app_base: str = Query("frontend://", alias="app", max_length=300)):
    """Shareable https link: opens the app on the sender screen with the code filled in."""
    host = (request.headers.get("x-forwarded-host") or request.headers.get("host") or "").split(",")[0].strip()
    own_web = f"https://{host}"  # web preview: same host as the API
    same_host = bool(host) and (app_base == own_web or app_base.startswith(own_web + "/"))
    base = app_base if same_host or _allowed_app_base(app_base) else "frontend://"
    if not base.endswith("/"):
        base += "/"
    app_url = html.escape(f"{base}sender?code={code}", quote=True)
    page = JOIN_HTML.replace("{{CODE}}", code).replace("{{APP_URL}}", app_url)
    return HTMLResponse(page, headers={"Cache-Control": "no-cache"})


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def start_index_build():
    app.state.index_task = asyncio.create_task(ensure_indexes())  # background: a big index build must not block boot

@app.on_event("shutdown")
async def shutdown_db_client():
    app.state.index_task.cancel()  # stop a build still running before its client closes
    with suppress(asyncio.CancelledError):
        await app.state.index_task
    client.close()
