// backend/ed/loadConfig.mjs
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import fs from "fs";

// Resolve ED root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve project root (two levels up from backend/ed)
const projectRoot = path.resolve(__dirname, "../..");

// Resolve Prisma config file
const prismaConfigPath = path.resolve(projectRoot, "prisma.config.js");

// Ensure prisma.config.js exists
if (!fs.existsSync(prismaConfigPath)) {
  throw new Error(`[ED] prisma.config.js not found at: ${prismaConfigPath}`);
}

// Dynamically import prisma.config.js
const prismaConfigModule = await import(pathToFileURL(prismaConfigPath).href);
const prismaConfig = prismaConfigModule.default;

export const EDConfig = {
  projectRoot,
  backendRoot: "backend",
  serverEntry: "backend/server.js",
  prismaSchemaPath: prismaConfig.schema,
  prismaMigrationsPath: prismaConfig.migrations?.path ?? null,
  baseUrl: "http://127.0.0.1:4000",
  healthEndpoint: "/health"
};
