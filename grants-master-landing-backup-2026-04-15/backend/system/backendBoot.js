import { prismaIntegrityCheck } from "./prismaIntegrityCheck.js";
import { resolvePrismaPath } from "./prismaPathResolver.js";

export async function backendBoot(logger) {
  logger.info("🔧 Validating Prisma environment...");

  const { prismaDir, schemaPath } = resolvePrismaPath();
  logger.info(`📍 Prisma directory: ${prismaDir}`);
  logger.info(`📄 Schema path: ${schemaPath}`);

  const { schemaHash, clientHash } = prismaIntegrityCheck(logger);

  logger.info(`🔒 Schema hash: ${schemaHash}`);
  logger.info(`🔒 Client hash: ${clientHash}`);

  logger.info("🚀 Prisma integrity confirmed. Continuing backend boot...");
}
