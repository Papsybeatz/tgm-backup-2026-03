import fs from "fs";
import path from "path";

const frontendRoot = path.resolve(process.cwd(), "..");
const stateDir = path.join(frontendRoot, "ed", "state");
if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });

const logFile = path.join(stateDir, "routeIntegrity.log");

function log(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `${timestamp} ${message}\n`);
  console.log(message);
}

function exists(p) {
  return fs.existsSync(p);
}

export function runFrontendRouteIntegrity() {
  log("🟣 FrontendRouteIntegrity started");

  const routesDir = path.join(frontendRoot, "src", "routes");
  if (!exists(routesDir)) {
    log("⚠️ src/routes missing — routing system incomplete.");
    return;
  }

  const files = fs.readdirSync(routesDir).filter((f) => f.endsWith(".jsx"));

  if (files.length === 0) {
    log("⚠️ No route files found in src/routes — UI may not navigate.");
  }

  for (const file of files) {
    const full = path.join(routesDir, file);
    const content = fs.readFileSync(full, "utf8");

    if (!content.includes("export default")) {
      log(`⚠️ Route ${file} missing default export — router may break.`);
    }

    if (content.includes("import") && content.includes("from") === false) {
      log(`⚠️ Route ${file} has malformed import syntax.`);
    }
  }

  log("🟣 FrontendRouteIntegrity completed");
}
