import fs from "fs";
import { frontendDiagnostics } from "../diagnostics/frontendDiagnostics.js";
import path from "path";
import { frontendInstallDoctor } from "../../ed/modules/frontendInstallDoctor.js";

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

  // Run FrontendInstallDoctor for self-healing
  logger.info("🩺 Running FrontendInstallDoctor (FID)...");
  const projectPath = path.resolve("../../");
  import("../../ed/modules/frontendInstallDoctor.js").then(async (mod) => {
    const result = await mod.runFrontendInstallDoctor();
    logger.info(`[FID] Status: ${result.status}`);
    if (result.status === "healthy") {
      logger.info("[FID] Frontend is clean and bootable.");
    } else if (result.status === "repaired") {
      logger.warn("[FID] Repairs applied:", result.repairs);
      logger.warn("[FID] Issues detected:", result.issues);
    } else {
      logger.error("[FID] Frontend install doctor failed:", result.errors);
      logger.error("[FID] Issues detected:", result.issues);
    }
    // Optionally: expose result for UI feedback
    globalThis.__FID_HEALTH_CERTIFICATE = result;
  });

  logger.warn("⚠️ Some issues require manual fixes (env vars, Vite config).");
}
