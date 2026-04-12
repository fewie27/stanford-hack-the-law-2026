import Constants from "expo-constants";

const LOCAL_DEV_BASE = "http://localhost:8000";

type Extra = { evidenceApiBaseUrl?: string | null };

function readExtra(): Extra {
  return (Constants.expoConfig?.extra ?? Constants.expo?.extra ?? {}) as Extra;
}

/**
 * Base URL for the Evidence Locker API.
 * - If root `.env` sets `EVIDENCE_API_BASE_URL`, that origin is used (no localhost).
 * - If unset or empty, local dev uses `http://localhost:8000`.
 */
export function getEvidenceApiBaseUrl(): string {
  const raw = readExtra().evidenceApiBaseUrl;
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim().replace(/\/$/, "");
  }
  return LOCAL_DEV_BASE;
}

/** True when a non-empty public API URL was baked in at build time (server / production). */
export function isProductionEvidenceApi(): boolean {
  const raw = readExtra().evidenceApiBaseUrl;
  return typeof raw === "string" && raw.trim().length > 0;
}
