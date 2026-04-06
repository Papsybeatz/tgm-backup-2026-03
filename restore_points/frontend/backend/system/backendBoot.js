import { prismaIntegrityCheck } from "./prismaIntegrityCheck.js";
import { resolvePrismaPath } from "./prismaPathResolver.js";
import { prismaRepairs } from "../ed/repairs/prismaRepairs.js";
import { envRepairs } from "../ed/repairs/envRepairs.js";
import { runBackendHealthV2 } from "../ed/modules/backendHealthCertificateV2.js";

export async function backendBoot(logger) {
  logger.info("🛠️ Running ED self-healing checks...");

  envRepairs(logger, [
    "OPENAI_API_KEY",
    "STRIPE_SECRET_KEY",
    "DATABASE_URL"
  ]);

  prismaRepairs(logger);

  logger.info("🔧 Validating Prisma environment...");

  const { prismaDir, schemaPath } = resolvePrismaPath();
  logger.info(`📍 Prisma directory: ${prismaDir}`);
  logger.info(`📄 Schema path: ${schemaPath}`);

  const { schemaHash, clientHash } = prismaIntegrityCheck(logger);

  logger.info(`🔒 Schema hash: ${schemaHash}`);
  logger.info(`🔒 Client hash: ${clientHash}`);

  logger.info("🚀 Prisma integrity confirmed. Continuing backend boot...");

  // Run HealthV2 unified backend health certificate
  (async () => {
    const health = await runBackendHealthV2({
      expectedPort: 4000,
      expectedHost: "127.0.0.1",
      expectedOrigins: ["http://127.0.0.1:5173", "http://localhost:5173"],
    });
    if (health.status === "failed") {
      if (typeof logger.error === "function") {
        logger.error("[backendBoot] ❌ Blocking backend boot due to failed health certificate.");
      } else {
        logger.info("[backendBoot] ❌ Blocking backend boot due to failed health certificate.");
      }
      process.exit(1);
    }
  })();
}
