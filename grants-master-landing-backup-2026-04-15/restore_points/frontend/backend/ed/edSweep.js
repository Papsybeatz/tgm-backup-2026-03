
// GrantsMasterVite/backend/ed/edSweep.js

import { checkRouterIntegrity } from "./modules/routerIntegrity.js";
import { checkFilesystemDrift } from "./modules/filesystemDrift.js";
import { validatePrismaSchema } from "./modules/prismaSchema.js";
import { ensurePrismaClient } from "./modules/prismaGenerate.js";
import { checkBackendBoot } from "./modules/backendBoot.js";
import { checkRouteMount } from "./modules/routeMount.js";
import logger from "./logger.js";

export async function edSweep(config) {
  logger.info("ED Sweep triggered.");

  // 1. Static router integrity
  await checkRouterIntegrity(config.backendRoot);
  // 2. Filesystem drift
  await checkFilesystemDrift(config.backendRoot);
  // 3. Prisma schema
  await validatePrismaSchema(config.prismaSchemaPath);
  // 4. Prisma client
  await ensurePrismaClient(config.backendRoot, config.prismaSchemaPath);
  // 5. Backend boot
  await checkBackendBoot(config.serverEntry, config.projectRoot);
  // 6. Route mounts
  await checkRouteMount(config.baseUrl);

  logger.info("ED Sweep completed.");
}
