// backend/ed/bootIntegrity.js
import path from "path";
import { fileURLToPath } from "url";
import { runSelfHealing } from "./selfHealingPrisma.js";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Force backend root
const backendRoot = path.resolve(__dirname, "..");
process.chdir(backendRoot);

// Logging
const stateDir = path.join(backendRoot, "ed", "state");
if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });

const logFile = path.join(stateDir, "bootIntegrity.log");
function log(msg) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `${timestamp} ${msg}\n`);
}

export function runBootIntegrity() {
  log("ED Boot Integrity Check Started");

  const ok = runSelfHealing();

  if (!ok) {
    log("ED Boot Integrity FAILED — backend startup blocked");
    return false;
  }

  log("ED Boot Integrity PASSED");
  return true;
}
