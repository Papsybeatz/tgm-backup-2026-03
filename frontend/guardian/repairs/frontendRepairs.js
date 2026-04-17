import fs from "fs";
import { frontendDiagnostics } from "../diagnostics/frontendDiagnostics.js";

export function frontendRepairs(logger) {
  const { issues } = frontendDiagnostics();

  if (issues.length === 0) {
    logger.info("🟢 Frontend is healthy — no repairs needed.");
    return;
  }

  logger.warn("🟡 Frontend issues detected:");
  issues.forEach(i => logger.warn(` - ${i}`));

  // Auto-repair: recreate generated folder
  if (issues.includes("Missing src/generated directory")) {
    logger.info("🔧 Recreating src/generated...");
    fs.mkdirSync("src/generated", { recursive: true });
  }

  logger.warn("⚠️ Some issues require manual fixes (env vars, Vite config).");
}
