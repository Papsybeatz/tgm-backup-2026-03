import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const CONFIG_PATH = path.resolve("prisma.config.js");
const CLIENT_PATH = path.resolve("node_modules/@prisma/client");
const AUDIT_LOG = path.resolve("backend/system/logs/prisma-engine.log");

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(AUDIT_LOG, line);
  console.log(message);
}

export function prismaEngineCheck() {
  log("🔍 Prisma Engine Check: Starting…");

  // 1. Ensure prisma.config.js exists
  if (!fs.existsSync(CONFIG_PATH)) {
    log("❌ prisma.config.js missing — backend cannot boot.");
    throw new Error("Missing prisma.config.js");
  }

  // 2. Read config
  const configText = fs.readFileSync(CONFIG_PATH, "utf8");

  // 3. Detect wrong engineType
  const wrongEngine =
    configText.includes(`engineType: "client"`) ||
    configText.includes(`engineType:"client"`);

  if (wrongEngine) {
    log("⚠️ Detected engineType: client — auto‑correcting…");

    const fixed = configText.replace(
      /engineType:\s*["']client["']/,
      `engineType: "node-api"`
    );

    fs.writeFileSync(CONFIG_PATH, fixed);
    log("🔧 Corrected engineType to node-api");
  }

  // 4. Ensure Prisma Client exists
  if (!fs.existsSync(CLIENT_PATH)) {
    log("⚠️ Prisma Client missing — regenerating…");
    execSync("npx prisma generate", { stdio: "inherit" });
    log("✔ Prisma Client regenerated");
  }

  // 5. Validate engine after correction
  const finalConfig = fs.readFileSync(CONFIG_PATH, "utf8");
  if (!finalConfig.includes(`engineType: "node-api"`)) {
    log("❌ Prisma engine still invalid — blocking backend boot.");
    throw new Error("Invalid Prisma engine configuration");
  }

  log("✅ Prisma Engine Check: Passed");
}
