import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, "..");
process.chdir(frontendRoot);

// --- Logging -------------------------------------------------------------

const stateDir = path.join(frontendRoot, "ed", "state");
if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });

const logFile = path.join(stateDir, "systemCheck.log");

function log(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `${timestamp} ${message}\n`);
}

function warn(issue, recommendation) {
  const timestamp = new Date().toISOString();
  const entry = `${timestamp} ⚠️ ${issue}\n   → Recommended next step: ${recommendation}\n`;
  fs.appendFileSync(logFile, entry);
  console.log(entry);
}

// --- Helpers -------------------------------------------------------------

function exists(p) {
  return fs.existsSync(p);
}

function run(cmd) {
  try {
    execSync(cmd, { stdio: "inherit" });
  } catch (err) {
    console.log("Command failed:", cmd);
  }
}

// --- SystemCheck ---------------------------------------------------------

export function runFrontendSystemCheck() {
  console.log("🛠️ Frontend-SystemCheck: Running full pre-flight inspection...");
  log("Frontend SystemCheck started");

  // 1. Validate folder structure
  const requiredFolders = ["src", "src/components", "src/routes"];
  for (const folder of requiredFolders) {
    const full = path.join(frontendRoot, folder);
    if (!exists(full)) {
      warn(
        `Missing folder: ${folder}`,
        `Recreate ${folder}/ or restore from version control. UI may fail to render.`
      );
    }
  }

  // 2. Validate index.html
  const indexHtml = path.join(frontendRoot, "index.html");
  if (!exists(indexHtml)) {
    warn(
      "index.html missing",
      "Recreate index.html. Vite cannot build or serve without it."
    );
  }

  // 3. Validate vite.config.js
  const viteConfig = path.join(frontendRoot, "vite.config.js");
  if (!exists(viteConfig)) {
    warn(
      "vite.config.js missing",
      "Recreate vite.config.js. Vite will fall back to defaults but routing may break."
    );
  }

  // 4. Validate main.jsx
  const mainJsx = path.join(frontendRoot, "src", "main.jsx");
  if (!exists(mainJsx)) {
    warn(
      "src/main.jsx missing",
      "Recreate main.jsx. React cannot mount without it."
    );
  }

  // 5. Validate App.jsx
  const appJsx = path.join(frontendRoot, "src", "App.jsx");
  if (!exists(appJsx)) {
    warn(
      "src/App.jsx missing",
      "Recreate App.jsx. UI will not render without a root component."
    );
  }

  // 6. Validate .env
  const envPath = path.join(frontendRoot, "../.env"); // Use GrantsMasterVite/.env
  if (!exists(envPath)) {
    warn(
      ".env missing",
      "Create GrantsMasterVite/.env with VITE_API_URL and VITE_STRIPE_PUBLIC_KEY. Frontend may fail to call backend."
    );
  }

  // 7. Validate VITE_API_URL
  if (exists(envPath)) {
    const env = fs.readFileSync(envPath, "utf8");
    if (!env.includes("VITE_API_URL")) {
      warn(
        "VITE_API_URL missing",
        "Add VITE_API_URL to .env. Example: VITE_API_URL=\"http://localhost:4000\""
      );
    }
  }

  // 8. Validate node_modules
  const nodeModules = path.join(frontendRoot, "node_modules");
  if (!exists(nodeModules)) {
    warn(
      "node_modules missing",
      "Run npm install. Frontend cannot start without dependencies."
    );
  }

  // 9. Validate React + Vite presence
  const requiredDeps = ["react", "react-dom", "vite"];
  for (const dep of requiredDeps) {
    if (!exists(path.join(nodeModules, dep))) {
      warn(
        `Missing dependency: ${dep}`,
        `Install with: npm install ${dep}`
      );
    }
  }

  log("Frontend SystemCheck completed");
  console.log("🛠️ Frontend-SystemCheck: Completed.\n");
  return true;
}
