import asyncio
import hashlib
import time
from collections import defaultdict, deque
from contextlib import suppress
from fastapi import FastAPI, APIRouter, HTTPException, Query, Request
from fastapi.responses import FileResponse, HTMLResponse
import html
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, IndexModel
from pymongo.errors import DuplicateKeyError
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
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
    "presence": [
        IndexModel([("code", ASCENDING)], name="code", unique=True),
        IndexModel([("updated_at", ASCENDING)], name="updated_at_ttl", expireAfterSeconds=120),
    ],
    "reports": [
        IndexModel([("reporter_device", ASCENDING), ("reported_device", ASCENDING)], name="pair", unique=True),
        IndexModel([("reported_device", ASCENDING)], name="reported"),
    ],
    "suspended": [IndexModel([("device", ASCENDING)], name="device", unique=True)],
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


@api_router.get("/")
async def root():
    return {"message": "Hello World"}

STAGE_HTML = ROOT_DIR / "stage.html"


# ---------- presence: "in attesa" status for codes the caller already knows ----------
class ReportIn(BaseModel):
    role: str = Field(pattern=r"^(sender|viewer)$")
    reason: str = Field(pattern=r"^(molestie|sessuale|minore|spam|altro)$")
    note: str = Field("", max_length=500)
    reported_code: str = Field("", pattern=r"^(\d{6})?$")
    reported_device: str = Field("", pattern=r"^([a-z0-9]{12,40})?$")
    reporter_device: str = Field("", pattern=r"^([a-z0-9]{12,40})?$")


SUSPEND_AFTER = 3  # distinct reporters


@api_router.post("/reports")
async def create_report(body: ReportIn, request: Request):
    rate_limit(request, "reports", 5)
    if not body.reported_device or not body.reporter_device or body.reported_device == body.reporter_device:
        raise HTTPException(status_code=400, detail="Segnalazione non valida")
    # one report per reporter/reported pair: the same person can't suspend someone alone
    await db.reports.update_one(
        {"reporter_device": body.reporter_device, "reported_device": body.reported_device},
        {"$setOnInsert": {**body.model_dump(), "created_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    n = len(await db.reports.distinct("reporter_device", {"reported_device": body.reported_device}))
    if n >= SUSPEND_AFTER:
        await db.suspended.update_one({"device": body.reported_device}, {"$setOnInsert": {"device": body.reported_device, "at": datetime.now(timezone.utc)}}, upsert=True)
    return {"ok": True}


@api_router.get("/suspended/{dev}")
async def is_suspended(dev: str, request: Request):
    rate_limit(request, "presence_r", 60)
    if not re.fullmatch(r"[a-z0-9]{12,40}", dev):
        return {"suspended": False}
    return {"suspended": bool(await db.suspended.find_one({"device": dev}, {"_id": 1}))}


class PresenceIn(BaseModel):
    code: str = Field(pattern=r"^\d{6}$")
    token: str = Field(pattern=r"^[A-Za-z0-9-]{16,64}$")  # random per viewer session, proves ownership of the code


PRESENCE_FRESH = timedelta(seconds=20)
_hits: dict[str, deque] = defaultdict(deque)


def rate_limit(request: Request, bucket: str, limit: int, per: float = 60.0) -> None:
    """Small in-memory per-IP sliding window (single process)."""
    # X-Forwarded-For = [client-forged..., real client, CDN, load balancer]: the two proxies append
    # the last two hops, so the third from the end is the real client (forged entries come before it)
    hops = [h.strip() for h in (request.headers.get("x-forwarded-for") or "").split(",") if h.strip()]
    ip = hops[-3] if len(hops) >= 3 else (hops[0] if hops else (request.client.host if request.client else ""))
    now = time.monotonic()
    if len(_hits) > 10000:  # drop idle entries so memory stays bounded
        for k in [k for k, v in _hits.items() if not v or now - v[-1] > per]:
            del _hits[k]
    q = _hits[f"{bucket}:{ip}"]
    while q and now - q[0] > per:
        q.popleft()
    if len(q) >= limit:
        raise HTTPException(status_code=429, detail="Troppe richieste, riprova tra poco")
    q.append(now)


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


@api_router.post("/presence")
async def presence_ping(body: PresenceIn, request: Request):
    rate_limit(request, "presence_w", 40)
    now = datetime.now(timezone.utc)
    th = _token_hash(body.token)
    # Only the owner may refresh a fresh entry; a stale one (owner gone) can be taken over
    res = await db.presence.update_one(
        {"code": body.code, "$or": [{"token": th}, {"updated_at": {"$lt": now - PRESENCE_FRESH}}]},
        {"$set": {"token": th, "updated_at": now}},
    )
    if res.matched_count == 0:
        try:
            await db.presence.insert_one({"code": body.code, "token": th, "updated_at": now})
        except DuplicateKeyError:
            raise HTTPException(status_code=409, detail="Codice già in uso")
    return {"ok": True}


@api_router.delete("/presence/{code}")
async def presence_leave(code: str, request: Request, token: str = Query("", max_length=64)):
    rate_limit(request, "presence_w", 40)
    if re.fullmatch(r"\d{6}", code) and token:
        await db.presence.delete_one({"code": code, "token": _token_hash(token)})
    return {"ok": True}


@api_router.get("/presence")
async def presence_check(request: Request, codes: str = Query("", max_length=200)):
    rate_limit(request, "presence_r", 60)
    wanted = [c for c in codes.split(",") if re.fullmatch(r"\d{6}", c)][:20]
    if not wanted:
        return {"online": []}
    since = datetime.now(timezone.utc) - PRESENCE_FRESH
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
