import Constants from "expo-constants";

const LOCAL_DEV_BASE = "http://localhost:8000";

type Extra = { evidenceApiBaseUrl?: string | null };

function readExtra(): Extra {
  return (Constants.expoConfig?.extra ?? Constants.expo?.extra ?? {}) as Extra;
}

/**
 * Base URL for the Evidence Locker API (no trailing slash).
 * - Explicit `EVIDENCE_API_BASE_URL` in root `.env` → that origin.
 * - Otherwise, Expo dev (`__DEV__`) → `http://localhost:8000` (API on another port).
 * - Otherwise (static export behind nginx/Docker) → `""` so requests use same origin; nginx proxies `/v1/` to the backend.
 */
export function getEvidenceApiBaseUrl(): string {
  const raw = readExtra().evidenceApiBaseUrl;
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim().replace(/\/$/, "");
  }
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    return LOCAL_DEV_BASE;
  }
  return "";
}

/** True when a non-empty API URL was set at build time (not same-origin / not localhost dev default). */
export function isProductionEvidenceApi(): boolean {
  const raw = readExtra().evidenceApiBaseUrl;
  return typeof raw === "string" && raw.trim().length > 0;
}

/** Ensure a public http(s) URL for `POST /v1/evidence/capture` (adds https:// when missing). */
export function normalizeEvidenceUrl(input: string): string {
  const t = input.trim();
  if (!t) {
    throw new Error("Please enter a URL.");
  }
  if (/^https?:\/\//i.test(t)) {
    return t;
  }
  return `https://${t}`;
}

export type CaptureResponse = {
  code: string;
};

/** Response from `POST /v1/evidence/capture` — combined record id and key (XXXX-YYYYYYYY). */
export async function captureEvidenceUrl(
  url: string,
  baseUrl: string = getEvidenceApiBaseUrl()
): Promise<CaptureResponse> {
  const base = baseUrl.replace(/\/$/, "");
  const api = `${base}/v1/evidence/capture`;
  const res = await fetch(api, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const text = await res.text();
  if (!res.ok) {
    let detail = text;
    try {
      const j = JSON.parse(text) as { detail?: unknown };
      if (typeof j.detail === "string") {
        detail = j.detail;
      } else if (Array.isArray(j.detail) && j.detail[0] && typeof j.detail[0] === "object") {
        const v = j.detail[0] as { msg?: string };
        if (typeof v.msg === "string") detail = v.msg;
      }
    } catch {
      /* use raw */
    }
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return JSON.parse(text) as CaptureResponse;
}

/** Metadata returned by `POST /v1/evidence/metadata` (capture-time IP and timestamp). */
export type EvidenceMetadata = {
  source_url: string;
  captured_at: string;
  client_ip: string;
  user_agent: string | null;
};

export async function fetchEvidenceMetadata(
  code: string,
  baseUrl: string = getEvidenceApiBaseUrl()
): Promise<EvidenceMetadata> {
  const url = `${baseUrl.replace(/\/$/, "")}/v1/evidence/metadata`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const text = await res.text();
  if (!res.ok) {
    let detail = text;
    try {
      const j = JSON.parse(text) as { detail?: string };
      if (typeof j.detail === "string") detail = j.detail;
    } catch {
      /* use raw */
    }
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return JSON.parse(text) as EvidenceMetadata;
}

/** Decrypted PNG bytes from `POST /v1/evidence/retrieve`. */
export async function fetchEvidenceImage(
  code: string,
  baseUrl: string = getEvidenceApiBaseUrl()
): Promise<Blob> {
  const url = `${baseUrl.replace(/\/$/, "")}/v1/evidence/retrieve`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    const text = await res.text();
    let detail = text;
    try {
      const j = JSON.parse(text) as { detail?: string };
      if (typeof j.detail === "string") detail = j.detail;
    } catch {
      /* use raw */
    }
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return res.blob();
}
