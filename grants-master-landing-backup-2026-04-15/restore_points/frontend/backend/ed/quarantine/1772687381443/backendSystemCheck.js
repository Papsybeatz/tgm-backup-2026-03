import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { autoPatchPrismaSchema } from "./ed/modules/prismaSchemaAutoPatch.js";
import { checkRouterIntegrity } from "./ed/modules/checkRouterIntegrity.js";
import { ghostModuleSweep } from "./ed/modules/ghostModuleSweep.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
dotenv.config({ path: path.resolve(projectRoot, ".env") });

import { ensurePrismaClient } from "./ed/modules/prismaGenerate.js";
import { validatePrismaSchema } from "./ed/modules/prismaSchema.js";
import { checkBackendBoot } from "./ed/modules/backendBoot.js";
import { ensurePrismaCLI } from "./ed/modules/prismaCliAutoPatch.js";
import { ensureEnvKeys } from "./ed/modules/envAutoPatch.js";
import fs from "fs";

export async function backendSystemCheck() {
  const results = {
    prismaCLI: null,
    prismaClient: null,
    prismaSchema: null,
    backendBoot: null,
    router: null,
    env: null,
    status: "HEALTHY"
  };

  // 1. Ensure Prisma CLI is available and self-healing
  try {
    results.prismaCLI = ensurePrismaCLI({ projectRoot });
    if (!results.prismaCLI.ok) results.status = "FAILING";
  } catch (err) {
    results.prismaCLI = { ok: false, error: err.message };
    results.status = "FAILING";
  }

  // 2. Ensure Prisma Client is generated
  try {
    results.prismaClient = await ensurePrismaClient({ projectRoot });
    if (!results.prismaClient.ok) results.status = "FAILING";
  } catch (err) {
    results.prismaClient = { ok: false, error: err.message };
    results.status = "FAILING";
  }

  // 3. Auto-patch Prisma schema before validation
  try {
    const schemaPatch = autoPatchPrismaSchema({ projectRoot });
    if (schemaPatch.patched) {
      console.log("[ED] Auto‑patched Prisma schema.");
    }
    results.prismaSchema = await validatePrismaSchema({ projectRoot });
    if (!results.prismaSchema.ok) results.status = "FAILING";
  } catch (err) {
    results.prismaSchema = { ok: false, error: err.message };
    results.status = "FAILING";
  }

  // 4. Ensure required env keys
  let requiredKeys = [];
  try {
    const envConfigPath = path.join(projectRoot, "backend", "ed", "requiredEnv.json");
    if (fs.existsSync(envConfigPath)) {
      const envConfig = JSON.parse(fs.readFileSync(envConfigPath, "utf8"));
      requiredKeys = Object.keys(envConfig.required);
    } else {
      requiredKeys = ["GROQ_API_KEY"];
    }
    results.env = ensureEnvKeys({ projectRoot, requiredKeys });
    if (results.env.patched) results.status = "DEGRADED";
  } catch (err) {
    results.env = { ok: false, error: err.message };
    results.status = "FAILING";
  }

  // 5. Check backend boot
  try {
    results.backendBoot = await checkBackendBoot({ projectRoot });
    if (!results.backendBoot.ok) results.status = "FAILING";
  } catch (err) {
    results.backendBoot = { ok: false, error: err.message };
    results.status = "FAILING";
  }

  // 0. Ghost module sweep
  try {
    const ghost = ghostModuleSweep({ projectRoot });
    if (!ghost.ok) {
      console.error("🧩 GHOST MODULE DETECTED:", ghost.hits);
      results.status = "FAILING";
      return results;
    }
  } catch (err) {
    console.error("Ghost sweep failed:", err);
  }

  // 6. Check router integrity (auto-patch is already integrated)
  try {
    results.router = await checkRouterIntegrity({ projectRoot });
    if (!results.router.ok) results.status = "FAILING";
  } catch (err) {
    results.router = { ok: false, error: err.message };
    results.status = "FAILING";
  }

  return results;
}
