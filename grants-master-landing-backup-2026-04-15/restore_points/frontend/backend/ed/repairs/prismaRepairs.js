import { execSync } from "child_process";
import { prismaDiagnostics } from "../diagnostics/prismaDiagnostics.js";

export function prismaRepairs(logger) {
  const { issues } = prismaDiagnostics();

  if (issues.length === 0) {
    logger.info("🟢 Prisma is healthy — no repairs needed.");
    return;
  }

  logger.warn("🟡 Prisma issues detected:");
  issues.forEach(i => logger.warn(` - ${i}`));

  if (issues.includes("Missing Prisma client")) {
    logger.info("🔧 Regenerating Prisma client...");
    execSync("npx prisma generate", { stdio: "inherit" });
  }

  logger.info("🟢 Prisma repairs complete.");
}
