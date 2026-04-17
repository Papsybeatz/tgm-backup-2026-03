import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const frontendRoot = path.resolve(process.cwd(), "..");
const stateDir = path.join(frontendRoot, "ed", "state");
if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });

const logFile = path.join(stateDir, "dependencyIntegrity.log");

function log(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `${timestamp} ${message}\n`);
  console.log(message);
}

function exists(p) {
  return fs.existsSync(p);
}

export function runFrontendDependencyIntegrity() {
  log("🟢 FrontendDependencyIntegrity started");

  const nodeModules = path.join(frontendRoot, "node_modules");
  if (!exists(nodeModules)) {
    log("⚠️ node_modules missing — reinstalling dependencies...");
    execSync("npm install", { cwd: frontendRoot, stdio: "inherit" });
  }

  const requiredDeps = [
    "react",
    "react-dom",
    "vite",
    "@vitejs/plugin-react",
  ];

  for (const dep of requiredDeps) {
    if (!exists(path.join(nodeModules, dep))) {
      log(`⚠️ Missing dependency: ${dep} — installing...`);
      execSync(`npm install ${dep}`,
        {
          cwd: frontendRoot,
          stdio: "inherit",
        }
      );
    }
  }

  log("🟢 FrontendDependencyIntegrity completed");
}
