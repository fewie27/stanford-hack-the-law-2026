import datetime as dt
import logging
from contextlib import asynccontextmanager
from typing import Annotated, Any

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field, HttpUrl
from playwright.async_api import Browser, async_playwright

from app.archive import EvidenceMetadata, build_uncompressed_tar, parse_uncompressed_tar
from app.codes import format_code, parse_code, random_record_id, random_unlock_key
from app.config import settings
from app.crypto import decrypt_blob, encrypt_blob
from app.screenshot import capture_url_screenshot
from app.ssrf import UnsafeUrlError, assert_public_http_url
from app.storage import read_vault, vault_exists, write_vault

logger = logging.getLogger(__name__)


class CaptureRequest(BaseModel):
    url: HttpUrl = Field(description="Public http(s) page to capture as evidence.")


class CaptureResponse(BaseModel):
    code: str = Field(description="Combined id and decryption key, formatted as XXXX-YYYYYYYY.")


class RetrieveRequest(BaseModel):
    code: str = Field(description="Evidence code returned from capture (XXXX-YYYYYYYY).")


class EvidenceMetadataResponse(BaseModel):
    """Metadata stored at capture time (client IP, UTC timestamp, source URL)."""

    source_url: str = Field(description="URL that was captured.")
    captured_at: str = Field(description="ISO 8601 UTC timestamp when the evidence was captured.")
    client_ip: str = Field(description="Client IP seen at capture time (from X-Forwarded-For or direct).")
    user_agent: str | None = Field(default=None, description="User-Agent header at capture time, if any.")


class ErrorBody(BaseModel):
    detail: str


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.basicConfig(level=logging.INFO)
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        app.state.browser = browser
        yield
        await browser.close()


app = FastAPI(
    title="Evidence Locker API",
    description="Capture immutable screenshots of web pages and retrieve them with a record id and key.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_browser(request: Request) -> Browser:
    return request.app.state.browser


BrowserDep = Annotated[Browser, Depends(get_browser)]


def _decrypt_evidence_archive(body: RetrieveRequest) -> tuple[dict[str, Any], bytes]:
    try:
        record_id, unlock_key = parse_code(body.code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    encrypted = read_vault(record_id)
    if encrypted is None:
        raise HTTPException(status_code=404, detail="No evidence found for that record id.")

    try:
        plain = decrypt_blob(unlock_key, encrypted)
    except Exception:
        raise HTTPException(status_code=403, detail="Decryption failed; check your key.") from None

    try:
        return parse_uncompressed_tar(plain)
    except Exception as e:
        logger.exception("Corrupt vault contents")
        raise HTTPException(status_code=500, detail=f"Stored archive is invalid: {e}") from e


@app.post(
    "/v1/evidence/capture",
    response_model=CaptureResponse,
    responses={400: {"model": ErrorBody}, 422: {"model": ErrorBody}},
    summary="Capture a URL and store an encrypted screenshot archive",
)
async def evidence_capture(body: CaptureRequest, request: Request, browser: BrowserDep):
    url_str = str(body.url).strip()
    try:
        assert_public_http_url(url_str)
    except UnsafeUrlError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    captured_at = dt.datetime.now(dt.timezone.utc).isoformat()
    ip = client_ip(request)
    ua = request.headers.get("user-agent")

    try:
        png = await capture_url_screenshot(browser, url_str)
    except Exception as e:
        logger.exception("Screenshot failed")
        raise HTTPException(status_code=422, detail=f"Could not capture page: {e}") from e

    meta = EvidenceMetadata(
        source_url=url_str,
        captured_at_iso=captured_at,
        client_ip=ip,
        user_agent=ua,
    )
    tar_plain = build_uncompressed_tar(meta, png)

    unlock_key = random_unlock_key(8)
    for _ in range(64):
        record_id = random_record_id(4)
        if not vault_exists(record_id):
            break
    else:
        raise HTTPException(status_code=503, detail="Could not allocate a unique record id; retry.")

    blob = encrypt_blob(unlock_key, tar_plain)
    write_vault(record_id, blob)
    return CaptureResponse(code=format_code(record_id, unlock_key))


@app.post(
    "/v1/evidence/metadata",
    response_model=EvidenceMetadataResponse,
    responses={400: {"model": ErrorBody}, 403: {"model": ErrorBody}, 404: {"model": ErrorBody}},
    summary="Retrieve capture metadata (IP, timestamp, source URL) using an evidence code",
)
async def evidence_metadata(body: RetrieveRequest):
    meta, _png = _decrypt_evidence_archive(body)
    return EvidenceMetadataResponse(
        source_url=meta["source_url"],
        captured_at=meta["captured_at"],
        client_ip=meta["client_ip"],
        user_agent=meta.get("user_agent"),
    )


@app.post(
    "/v1/evidence/retrieve",
    responses={
        200: {"content": {"image/png": {}}},
        400: {"model": ErrorBody},
        403: {"model": ErrorBody},
        404: {"model": ErrorBody},
    },
    summary="Retrieve decrypted PNG screenshot using an evidence code (metadata: POST /v1/evidence/metadata)",
)
async def evidence_retrieve(body: RetrieveRequest):
    _meta, png = _decrypt_evidence_archive(body)

    headers = {
        "Content-Disposition": 'inline; filename="evidence.png"',
    }

    return StreamingResponse(
        iter([png]),
        media_type="image/png",
        headers=headers,
    )


@app.get("/healthz")
async def healthz():
    return JSONResponse({"status": "ok"})
