import Constants from "expo-constants";

const LOCAL_DEV_BASE = "http://localhost:8000";

type Extra = { evidenceApiBaseUrl?: string | null };

function readExtra(): Extra {
  return (Constants.expoConfig?.extra ?? Constants.expo?.extra ?? {}) as Extra;
}

/**
 * Turn env values like `api-evidence.example.com` into `https://api-evidence.example.com`.
 * Without a scheme, `host/v1/...` is treated as a *relative* URL and becomes
 * `https://<current-site>/host/v1/...` (wrong).
 */
export function normalizeApiOrigin(input: string): string {
  const t = input.trim().replace(/\/$/, "");
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) {
    return t;
  }
  return `https://${t}`;
}

/** Join path (e.g. `/v1/evidence/capture`) to base origin or same-document root-relative path. */
function apiUrl(path: string, baseUrl: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = baseUrl.replace(/\/$/, "");
  if (base === "") {
    return p;
  }
  const origin = normalizeApiOrigin(base);
  return new URL(p, origin.endsWith("/") ? origin : `${origin}/`).href;
}

function explicitApiOriginFromBuild(): string | null {
  try {
    const pub = process.env.EXPO_PUBLIC_EVIDENCE_API_BASE_URL;
    if (typeof pub === "string" && pub.trim().length > 0) {
      return normalizeApiOrigin(pub);
    }
  } catch {
    /* ignore */
  }
  const raw = readExtra().evidenceApiBaseUrl;
  if (typeof raw === "string" && raw.trim().length > 0) {
    return normalizeApiOrigin(raw);
  }
  return null;
}

/**
 * Base URL for the Evidence Locker API (no trailing slash).
 * - `EXPO_PUBLIC_EVIDENCE_API_BASE_URL` (inlined) / `extra.evidenceApiBaseUrl` → that origin (bare hostnames get `https://`).
 * - Otherwise, Expo dev (`__DEV__`) → `http://localhost:8000` (API on another port).
 * - Otherwise (static export behind nginx/Docker) → `""` so requests use same origin; nginx proxies `/v1/` to the backend.
 */
export function getEvidenceApiBaseUrl(): string {
  const explicit = explicitApiOriginFromBuild();
  if (explicit !== null && explicit.length > 0) {
    return explicit;
  }
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    return LOCAL_DEV_BASE;
  }
  return "";
}

/** True when a non-empty API URL was set at build time (not same-origin / not localhost dev default). */
export function isProductionEvidenceApi(): boolean {
  return explicitApiOriginFromBuild() !== null;
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
  const api = apiUrl("/v1/evidence/capture", baseUrl);
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

/** Upload a local image via `POST /v1/evidence/upload` (multipart); stored as PNG like URL capture. */
export async function uploadEvidenceImage(
  file: File,
  baseUrl: string = getEvidenceApiBaseUrl()
): Promise<CaptureResponse> {
  const api = apiUrl("/v1/evidence/upload", baseUrl);
  const form = new FormData();
  form.append("file", file, file.name);
  const res = await fetch(api, {
    method: "POST",
    body: form,
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
  const url = apiUrl("/v1/evidence/metadata", baseUrl);
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

/** Classification result from `POST /v1/evidence/classify`. */
export type ClassificationResult = {
  category: string;
  confidence: number;
  summary: string;
  suggested_tags: string[];
  input_type: string;
  url: string;
};

export async function classifyEvidence(
  url: string,
  baseUrl: string = getEvidenceApiBaseUrl()
): Promise<ClassificationResult> {
  const api = apiUrl("/v1/evidence/classify", baseUrl);
  const res = await fetch(api, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
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
  return JSON.parse(text) as ClassificationResult;
}

/** Decrypted PNG bytes from `POST /v1/evidence/retrieve`. */
export async function fetchEvidenceImage(
  code: string,
  baseUrl: string = getEvidenceApiBaseUrl()
): Promise<Blob> {
  const url = apiUrl("/v1/evidence/retrieve", baseUrl);
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
