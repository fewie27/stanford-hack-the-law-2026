# Stanford Hack the Law 2026

Contributors (alphabetical order):
- Adèle Boreau-Potocki
- Archit Lohani
- Dora Gan
- Felix Wiegand
- Kristi Sun

This repository contains a small full-stack project for an **evidence locker**: a place to preserve **non-editable** records of online harassment (for example, a faithful screenshot of a public web page linked by URL). The goal is to give people a simple way to capture and later retrieve evidence using a short code, without leaving decrypted material on the server after retrieval.

## Environment

Root **`.env`** defines **`EVIDENCE_API_BASE_URL`** (scheme + host, no trailing slash). If it is **empty**, the frontend uses **`http://localhost:8000`** for the API. If it is **set** (e.g. `https://api.example.com`), the app uses only that origin and does not call `localhost:8000`. Docker Compose passes the same variable into the **web** image build so static exports embed the correct API URL.

## Layout

- **`frontend/`** — Web / React Native (Expo) client UI.
- **`backend/`** — Python **FastAPI** service: captures a URL in a headless browser, stores an **encrypted** archive (uncompressed tar of metadata + PNG), and serves decrypted images only when a valid **record id + key** is presented.
- **`openapi/`** — OpenAPI descriptions of the backend (`openapi.json`, `openapi.yaml`). Regenerate after API changes with `cd backend && python export_openapi.py` (with dependencies installed).

## Backend quick start

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
export EVIDENCE_APP_PEPPER="use-a-long-random-secret-in-production"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Docker: `docker build -t evidence-api ./backend` then run with a volume mounted at `/data/vaults` and `EVIDENCE_DATA_DIR=/data/vaults`.

## API overview

| Method | Path | Purpose |
|--------|------|--------|
| `POST` | `/v1/evidence/capture` | JSON `{"url": "https://..."}` → returns `{"code": "XXXX-YYYYYYYY"}` (4-char id + 8-char key). |
| `POST` | `/v1/evidence/retrieve` | JSON `{"code": "XXXX-YYYYYYYY"}` → PNG body (screenshot only). |
| `POST` | `/v1/evidence/metadata` | Same JSON body → JSON with `source_url`, `captured_at` (UTC ISO), `client_ip`, and optional `user_agent` from capture. |

The server does not keep decrypted archives on disk; decryption happens in memory for each retrieve request.

---

*This tool is intended for lawful documentation and safety use cases; follow applicable laws and platform terms.*
