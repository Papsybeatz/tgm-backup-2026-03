// backend/ed/watchdog.js
import http from "http";
import { runSelfHealing } from "./selfHealingPrisma.js";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendRoot = path.resolve(__dirname, "..");
process.chdir(backendRoot);

const stateDir = path.join(backendRoot, "ed", "state");
if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });

const logFile = path.join(stateDir, "watchdog.log");
function log(msg) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `${timestamp} ${msg}\n`);
}

function checkBackendHealth() {
  return new Promise((resolve) => {
    const req = http.get("http://127.0.0.1:4000/health", (res) => {
      resolve(res.statusCode === 200);
    });

    req.on("error", () => resolve(false));
    req.setTimeout(2000, () => resolve(false));
  });
}

function restartBackend() {
  log("Restarting backend server...");

  const child = spawn("node", ["server.js"], {
    cwd: backendRoot,
    stdio: "inherit",
    shell: true
  });

  child.on("exit", (code) => {
    log(`Backend exited with code ${code}`);
  });
}

async function watchdogLoop() {
  log("ED Watchdog started");

  setInterval(async () => {
    const healthy = await checkBackendHealth();

    if (!healthy) {
      log("Backend unhealthy — running self-healing...");
      const ok = runSelfHealing();

      if (ok) {
        log("Self-healing succeeded — restarting backend");
        restartBackend();
      } else {
        log("Self-healing failed — manual intervention required");
      }
    }
  }, 5000); // check every 5 seconds
}

watchdogLoop();
