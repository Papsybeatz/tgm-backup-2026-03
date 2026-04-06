// masterHealth.js
// Centralized health orchestrator for TGM's dual‑guardian system.
// Runs backend + frontend checks, aggregates results, and exposes a stable API + CLI.

import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

// --- Resolve project root (CWD‑immune) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// --- Prisma CLI check (ESM safe) ---
const backendDir = path.join(process.cwd(), "backend");
let prismaCLIAvailable = false;
try {
  execSync("npx prisma --version", {
    cwd: backendDir,
    stdio: "ignore"
  });
  prismaCLIAvailable = true;
  console.log("Prisma CLI available.");
} catch (err) {
  prismaCLIAvailable = false;
  console.error("Prisma CLI not available.");
}

// --- Import guardian modules ---
import { backendSystemCheck } from "../backend/backendSystemCheck.js";
import { frontendSystemCheck } from "../frontend/frontendSystemCheck.js";

// --- Health Status Enum ---
export const HEALTH_STATUS = {
  HEALTHY: "HEALTHY",
  DEGRADED: "DEGRADED",
  FAILING: "FAILING"
};

// --- Aggregate Health Logic ---
export async function runMasterHealth() {
  const results = {
    timestamp: new Date().toISOString(),
    backend: null,
    frontend: null,
    overall: HEALTH_STATUS.HEALTHY
  };

  try {
    results.backend = await backendSystemCheck({ projectRoot });
  } catch (err) {
    results.backend = { status: HEALTH_STATUS.FAILING, error: err.message };
  }

  try {
    results.frontend = await frontendSystemCheck({ projectRoot });
  } catch (err) {
    results.frontend = { status: HEALTH_STATUS.FAILING, error: err.message };
  }

  // --- Compute overall status ---
  const statuses = [results.backend.status, results.frontend.status];

  if (statuses.includes(HEALTH_STATUS.FAILING)) {
    results.overall = HEALTH_STATUS.FAILING;
  } else if (statuses.includes(HEALTH_STATUS.DEGRADED)) {
    results.overall = HEALTH_STATUS.DEGRADED;
  } else {
    results.overall = HEALTH_STATUS.HEALTHY;
  }

  return results;
}

// --- Pretty Printer ---
function printResults(results) {
  console.log("\n=== TGM MASTER HEALTH CHECK ===");
  console.log(`Timestamp: ${results.timestamp}`);
  console.log(`Overall: ${results.overall}\n`);

  console.log("--- Backend ---");
  console.log(results.backend);

  console.log("\n--- Frontend ---");
  console.log(results.frontend);

  console.log("\n===============================\n");
}

// --- CLI Entrypoint ---
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMasterHealth()
    .then((results) => {
      printResults(results);

      // Exit codes for ED automation
      if (results.overall === HEALTH_STATUS.HEALTHY) process.exit(0);
      if (results.overall === HEALTH_STATUS.DEGRADED) process.exit(1);
      if (results.overall === HEALTH_STATUS.FAILING) process.exit(2);
    })
    .catch((err) => {
      console.error("MASTER HEALTH ERROR:", err);
      process.exit(3);
    });
}
