// backend/ed/modules/systemCheck.js


// backend/ed/modules/systemCheck.js

import { ensurePrismaClient } from "./prismaGenerate.js";
import { validatePrismaSchema } from "./prismaSchema.js";
import { checkBackendBoot } from "./backendBoot.js";
import { checkEnvIntegrity } from "./envIntegrity.js";
import { migrateEnvToRoot } from "./envMigrate.js";
import { checkRouterIntegrity } from "./checkRouterIntegrity.js";

export async function runSystemCheck(config) {

    // Print environment mode banner and timestamp
    const mode = (process.env.NODE_ENV === "development") ? "DEVELOPMENT" : (process.env.NODE_ENV === "production") ? "PRODUCTION" : "PRODUCTION";
    const banner = mode === "DEVELOPMENT"
      ? "[ED] Environment mode: DEVELOPMENT — lenient AI key rules (missing keys allowed)"
      : "[ED] Environment mode: PRODUCTION — strict AI key enforcement (missing keys block startup)";
    const now = new Date();
    const tz = Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).format(now).split(' ').pop();
    const timestamp = `[ED] Timestamp: ${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} ${tz}`;
    console.log("\n" + banner + "\n" + timestamp + "\n\uE9D9\uE9DA\n");

    let allOk = true;

  // 1. Router integrity
  if (checkRouterIntegrity) {
    const routerOk = await checkRouterIntegrity({ projectRoot: config.projectRoot });
    if (!routerOk || routerOk.ok === false) {
      console.error("[ED] Router integrity check failed.");
      allOk = false;
    }
  }

  // 3. Prisma schema
  if (validatePrismaSchema) {
    const schemaOk = await validatePrismaSchema(config.prismaSchemaPath);
    if (!schemaOk) {
      console.error("[ED] Prisma schema validation failed.");
      allOk = false;
    }
  }

  // 4. Prisma client
  if (ensurePrismaClient) {
    const clientOk = await ensurePrismaClient(config.backendRoot, config.prismaSchemaPath);
    if (!clientOk) {
      console.error("[ED] Prisma client generation failed.");
      allOk = false;
    }
  }

  // Prisma CLI integrity
  const prismaCliOk = ensurePrismaCLI(config.projectRoot);
  if (!prismaCliOk) return false;

  // Prisma Client integrity with self-heal fallback
  let prismaClientOk = ensurePrismaClient(config.projectRoot);
  if (!prismaClientOk) {
    console.warn("[ED] Prisma Client integrity failed. Attempting self-heal...");
    const healed = selfHealPrisma(config.projectRoot);
    if (!healed) return false;
    prismaClientOk = ensurePrismaClient(config.projectRoot);
    if (!prismaClientOk) return false;
  }

  // 7. Environment variable migration and integrity
  console.log("[ED] envMigrate: migrating backend/.env to root .env if needed...");
  migrateEnvToRoot(config.projectRoot);
  console.log("[ED] envIntegrity: verifying required environment variables...");
  const envOk = checkEnvIntegrity(config.projectRoot);
  if (!envOk) {
    console.error("❌ ED: Environment integrity failed. Backend startup blocked.");
    return false;
  }

  // 8. Backend boot
  if (checkBackendBoot) {
    const bootOk = await checkBackendBoot(config.serverEntry, config.projectRoot);
    if (!bootOk) {
      console.error("[ED] Backend boot check failed.");
      allOk = false;
    }
  }

  return allOk;
}
