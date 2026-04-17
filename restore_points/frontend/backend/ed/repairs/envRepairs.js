import { envDiagnostics } from "../diagnostics/envDiagnostics.js";

export function envRepairs(logger, requiredKeys) {
  const issues = envDiagnostics(requiredKeys);

  if (issues.length === 0) {
    logger.info("🟢 Environment is healthy.");
    return;
  }

  logger.warn("🟡 Environment issues detected:");
  issues.forEach(i => logger.warn(` - ${i}`));

  logger.warn("⚠️ These cannot be auto-repaired. Please update your .env file.");
}
