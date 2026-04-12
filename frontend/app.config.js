const path = require("path");
const fs = require("fs");

const rootEnvPath = path.join(__dirname, "..", ".env");
const frontendEnvPath = path.join(__dirname, ".env");
if (fs.existsSync(rootEnvPath)) {
  require("dotenv").config({ path: rootEnvPath });
}
if (fs.existsSync(frontendEnvPath)) {
  require("dotenv").config({ path: frontendEnvPath });
}

const appJson = require("./app.json");

const fromEnv =
  process.env.EVIDENCE_API_BASE_URL?.trim() ||
  process.env.EXPO_PUBLIC_EVIDENCE_API_BASE_URL?.trim() ||
  "";

// Metro inlines EXPO_PUBLIC_* in the web bundle (more reliable than expo-constants `extra` alone).
if (fromEnv.length > 0 && !process.env.EXPO_PUBLIC_EVIDENCE_API_BASE_URL?.trim()) {
  process.env.EXPO_PUBLIC_EVIDENCE_API_BASE_URL = fromEnv;
}

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra || {}),
      evidenceApiBaseUrl: fromEnv.length > 0 ? fromEnv : null,
    },
  },
};
