// backend/ed/modules/autoPatch.js

import fs from "fs";
import path from "path";
import { ensurePrismaClient } from "./prismaGenerate.js";

/**
 * Ensure /health endpoint exists in server.js
 */
function ensureHealthEndpoint(serverJsPath) {
  if (!fs.existsSync(serverJsPath)) {
    console.log("❌ server.js missing — cannot patch /health.");
    return false;
  }

  const content = fs.readFileSync(serverJsPath, "utf-8");

  if (content.includes('app.get("/health"')) {
    console.log("✅ /health endpoint already present.");
    return true;
  }

  const injection = `
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});
`;

  if (!content.includes("const app =") && !content.includes("const app = express(")) {
    console.log("⚠️ Could not find app instance in server.js — skipping /health patch.");
    return false;
  }

  const patched = content + injection;
  fs.writeFileSync(serverJsPath, patched, "utf-8");
  console.log("✅ /health endpoint patched into server.js.");
  return true;
}

/**
 * Normalize imports in server.js to avoid absolute Windows paths
 */
function normalizeServerImports(serverJsPath) {
  if (!fs.existsSync(serverJsPath)) return false;

  let content = fs.readFileSync(serverJsPath, "utf-8");
  let changed = false;

  // Very conservative: just warn if absolute drive letters appear
  if (content.match(/[A-Za-z]:\\/)) {
    console.log("⚠️ Absolute Windows path detected in server.js imports.");
    // You can add more aggressive auto-fix logic here if desired.
  }

  if (changed) {
    fs.writeFileSync(serverJsPath, content, "utf-8");
    console.log("✅ server.js imports normalized.");
  }

  return true;
}

/**
 * Ensure core backend files exist (hooks for future templates)
 */
function ensureCoreFiles(backendRoot) {
  const required = ["server.js", "routes", "prisma"];

  let ok = true;

  for (const item of required) {
    const full = path.join(backendRoot, item);
    if (!fs.existsSync(full)) {
      console.log(`⚠️ Missing core item: ${item} — no template attached, manual restore required.`);
      ok = false;
    }
  }

  return ok;
}

/**
 * Main ED AutoPatch entrypoint
 */
export async function runAutoPatch(config, ED_ROOT) {
  console.log("🩹 ED-AutoPatch: attempting safe automatic repairs...");

  const projectRoot = path.resolve(ED_ROOT, "..", "..");
  const backendRoot = path.join(projectRoot, config.backendRoot);
  const serverJsPath = path.join(projectRoot, config.serverEntry);
  const prismaSchemaPath = path.join(projectRoot, config.prismaSchemaPath);

  // 1. Ensure core files/folders exist
  ensureCoreFiles(backendRoot);

  // 2. Prisma Client autofix (already robust)
  await ensurePrismaClient(backendRoot, prismaSchemaPath);

  // 3. Ensure /health endpoint exists
  ensureHealthEndpoint(serverJsPath);

  // 4. Normalize server.js imports (ESM safety)
  normalizeServerImports(serverJsPath);

  console.log("🩹 ED-AutoPatch: completed.");
}
