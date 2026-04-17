
// backend/ed/selfHealingPrisma.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Force ED to operate from backend root
const backendRoot = path.resolve(__dirname, ".."); // Updated to use import.meta.url
process.chdir(backendRoot);

// Load ED config (auto or ask)
const configPath = path.join(backendRoot, "ed", "state", "config.json");
let mode = "auto";
if (fs.existsSync(configPath)) {
  mode = JSON.parse(fs.readFileSync(configPath, "utf8")).mode || "auto";
}

// Logging utilities
const stateDir = path.join(backendRoot, "ed", "state");
if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });

const logFile = path.join(stateDir, "repairHistory.log");
const jsonLogFile = path.join(stateDir, "repairHistory.json");

function log(message, data = null) {
  const timestamp = new Date().toISOString();
  const entry = { timestamp, message, data };

  // Human-readable log
  fs.appendFileSync(logFile, `${timestamp} ${message}\n`);

  // JSON log
  let json = [];
  if (fs.existsSync(jsonLogFile)) {
    json = JSON.parse(fs.readFileSync(jsonLogFile, "utf8"));
  }
  json.push(entry);
  fs.writeFileSync(jsonLogFile, JSON.stringify(json, null, 2));
}

function run(cmd) {
  return execSync(cmd, { stdio: "inherit" });
}

// Validate Prisma client folder
function validatePrismaClient() {
  const clientPath = path.join(backendRoot, "node_modules", "@prisma", "client");
  const required = ["index.js", "runtime", "package.json"];
  const missing = required.filter(f => !fs.existsSync(path.join(clientPath, f)));

  return { clientPath, missing, valid: missing.length === 0 };
}

// Validate schema + DB
function validateSchemaAndDB() {
  // Load ED config for schema path
  const configPath = path.resolve(__dirname, "ed/config.json");
  let edConfig = {};
  if (fs.existsSync(configPath)) {
    edConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  }
  const schemaPath = path.resolve(process.cwd(), edConfig.prismaSchemaPath || "../../prisma/schema.prisma");
  console.log('Resolved schema path from config:', schemaPath);
  const schemaExists = fs.existsSync(schemaPath);

  const envPath = path.join(backendRoot, ".env");
  let databaseUrl = "";
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, "utf8");
    const match = env.match(/DATABASE_URL\s*=\s*"(.*)"/);
    if (match) databaseUrl = match[1];
  }

  let dbExists = false;
  if (databaseUrl.startsWith("file:")) {
    const dbFile = databaseUrl.replace("file:", "");
    const dbPath = path.join(backendRoot, dbFile);
    dbExists = fs.existsSync(dbPath);
  }

  return { schemaExists, databaseUrl, dbExists };
}

// Auto-repair Prisma client
function repairPrismaClient() {
  log("Repairing Prisma client...");

  run("npm install @prisma/client");
  run("npx prisma generate");

  const validation = validatePrismaClient();
  if (!validation.valid) {
    log("Prisma client still invalid after repair", validation);
    return false;
  }

  log("Prisma client repaired successfully");
  return true;
}

// Auto-create DB if missing
function repairDatabase(databaseUrl) {
  if (!databaseUrl.startsWith("file:")) return true;

  log("Database missing — running prisma db push");
  run("npx prisma db push");
  return true;
}

// Main self-healing routine
export function runSelfHealing() {
  log(`ED Self-Healing Prisma started in ${mode.toUpperCase()} mode`);

  const schemaCheck = validateSchemaAndDB();
  const clientCheck = validatePrismaClient();

  if (!schemaCheck.schemaExists) {
    log("Schema missing — cannot continue", schemaCheck);
    return false;
  }

  if (!schemaCheck.databaseUrl) {
    log("DATABASE_URL missing — creating default SQLite .env");
    fs.writeFileSync(
      path.join(backendRoot, ".env"),
      `DATABASE_URL="file:./dev.db"\n`
    );
  }

  if (!schemaCheck.dbExists) {
    if (mode === "ask") {
      log("DB missing — ASK mode: waiting for user");
      return false;
    }
    repairDatabase(schemaCheck.databaseUrl);
  }

  if (!clientCheck.valid) {
    if (mode === "ask") {
      log("Prisma client invalid — ASK mode: waiting for user", clientCheck);
      return false;
    }
    repairPrismaClient();
  }

  log("ED Prisma Self-Healing completed successfully");
  return true;
}
