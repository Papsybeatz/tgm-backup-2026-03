import dotenv from "dotenv";
dotenv.config();
// Self-diagnosing ED config validator and auto-patcher
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATH = path.resolve(__dirname, "config.json");
const EXPECTED = {
  backendRoot: "backend",
  serverEntry: "backend/server.js",
  prismaSchemaPath: "backend/prisma/schema.prisma",
  healthEndpoint: "/health"
};

function validateAndPatchConfig() {
  let config;
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch (e) {
    console.error("Failed to read ED config:", e.message);
    process.exit(1);
  }

  let changed = false;
  for (const key of Object.keys(EXPECTED)) {
    if (config[key] !== EXPECTED[key]) {
      console.warn(`Config drift detected: ${key} should be '${EXPECTED[key]}', found '${config[key]}'`);
      config[key] = EXPECTED[key];
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log("ED config auto-patched to canonical paths.");
  } else {
    console.log("ED config is canonical and healthy.");
  }
}

validateAndPatchConfig();
