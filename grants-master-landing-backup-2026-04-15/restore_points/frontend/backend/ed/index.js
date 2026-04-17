import { selfHealPrisma } from './selfHealingPrisma.js';
import { selfHealPrismaV2 } from './selfHealingPrismaV2.js';
import { fixPrismaClient } from './fixPrismaClient.js';
import { runPrismaDiagnostics } from './modules/prismaClientDiagnostics.js';
import path from 'path';
import { startBackend } from './runBackendBootIntegrity.js';
// ED Main Entrypoint: Wiring & Triggers
import { edSweep } from "./edSweep.js";
import { errorParser } from "./modules/errorParser.js";
import { prismaSchemaAdvancedCheck } from "./modules/prismaSchemaAdvanced.js";
import { edLog } from "./logger.js";
import prismaClientRepair from "./modules/prismaClientRepair.js";

// Manual trigger (for CLI or dev)
if (process.argv.includes("--sweep")) {
  edSweep("manual");
}

if (process.argv.includes("--error-parse")) {
  errorParser();
}

if (process.argv.includes("--prisma-advanced")) {
  prismaSchemaAdvancedCheck();
}

// Example: Trigger sweep on backend start
edSweep("startup");

// Run self-healing Prisma engine on startup
selfHealPrisma();

// Run advanced self-healing Prisma V2 engine on startup
selfHealPrismaV2();

// Run automated Prisma client fixes on startup
fixPrismaClient();

// Run Prisma diagnostics on startup
runPrismaDiagnostics().then(result => {
  console.log('[ED] Prisma Diagnostics:', result);
});

// Start backend from correct working directory (ED boot integrity)
const projectRoot = path.resolve(__dirname, '../../');
startBackend(projectRoot);

// Example: Trigger sweep every 5 minutes (cron)
setInterval(() => {
  edSweep("cron");
}, 5 * 60 * 1000);

// Example: Watch for backend crash (simple simulation)
process.on("uncaughtException", (err) => {
  edLog(`Backend crash detected: ${err.message}`);
  edSweep("crash");
  // Auto-repair PrismaClient initialization errors
  if (err && err.name === "PrismaClientInitializationError") {
    edLog("[ED] Detected PrismaClientInitializationError, running auto-repair...");
    prismaClientRepair();
  }
});

// Example: Watch for Prisma errors in log (simulation)
setInterval(() => {
  errorParser();
}, 2 * 60 * 1000);

// Direct workflow integration: run auto-repair if PrismaClient error detected during sweep
async function mainEDWorkflow() {
  try {
    await edSweep("startup");
    await prismaSchemaAdvancedCheck();
    // ...other modules...
  } catch (error) {
    if (error && error.name === "PrismaClientInitializationError") {
      edLog("[ED] Detected PrismaClientInitializationError in main workflow, running auto-repair...");
      prismaClientRepair();
    }
  }
}
mainEDWorkflow();
