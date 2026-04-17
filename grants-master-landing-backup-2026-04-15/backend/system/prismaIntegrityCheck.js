
import fs from "fs";
import crypto from "crypto";
import path from "path";
import { resolvePrismaPath } from "./prismaPathResolver.js";
import { execSync } from "child_process";

export function prismaIntegrityCheck(logger) {
  const { prismaDir, schemaPath } = resolvePrismaPath();

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`❌ Prisma schema not found at: ${schemaPath}`);
  }

  // Hash schema
  const schema = fs.readFileSync(schemaPath, "utf8");
  const schemaHash = crypto.createHash("sha256").update(schema).digest("hex");

  // Check client folder
  const clientDir = path.join(prismaDir, "..", "node_modules", "@prisma", "client");
  const clientExists = fs.existsSync(clientDir);

  if (!clientExists) {
    logger.warn("⚠️ Prisma client missing — regenerating...");
    execSync("npx prisma generate", { stdio: "inherit" });
  }

  // Optional: hash client to detect drift
  const clientHash = clientExists
    ? crypto.createHash("sha256").update(fs.readFileSync(path.join(clientDir, "index.js"), "utf8")).digest("hex")
    : null;

  if (clientHash && clientHash === schemaHash) {
    logger.info("✅ Prisma schema and client are in sync.");
  } else {
    logger.warn("⚠️ Prisma drift detected — regenerating client...");
    execSync("npx prisma generate", { stdio: "inherit" });
  }

  return { schemaHash, clientHash };
}
