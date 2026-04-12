const path = require("path");
const fs = require("fs");

const rootEnvPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(rootEnvPath)) {
  require("dotenv").config({ path: rootEnvPath });
}

const appJson = require("./app.json");

const fromEnv =
  process.env.EVIDENCE_API_BASE_URL?.trim() ||
  process.env.EXPO_PUBLIC_EVIDENCE_API_BASE_URL?.trim() ||
  "";

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra || {}),
      evidenceApiBaseUrl: fromEnv.length > 0 ? fromEnv : null,
    },
  },
};
