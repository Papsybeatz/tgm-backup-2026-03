import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const frontendRoot = path.resolve(process.cwd(), "..");
const stateDir = path.join(frontendRoot, "ed", "state");
if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });

const logFile = path.join(stateDir, "buildIntegrity.log");

function log(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `${timestamp} ${message}\n`);
  console.log(message);
}

function exists(p) {
  return fs.existsSync(p);
}

export function runFrontendBuildIntegrity() {
  log("🔵 FrontendBuildIntegrity started");

  // 1. Validate index.html
  const indexHtml = path.join(frontendRoot, "index.html");
  if (!exists(indexHtml)) {
    log("⚠️ index.html missing — Vite cannot build without it.");
  } else {
    const html = fs.readFileSync(indexHtml, "utf8");
    if (!html.includes("/src/main.jsx")) {
      log("⚠️ index.html missing script entrypoint → /src/main.jsx");
    }
  }

  // 2. Validate vite.config.js
  const viteConfig = path.join(frontendRoot, "vite.config.js");
  if (!exists(viteConfig)) {
    log("⚠️ vite.config.js missing — Vite will fall back to defaults.");
  }

  // 3. Validate main.jsx
  const mainJsx = path.join(frontendRoot, "src", "main.jsx");
  if (!exists(mainJsx)) {
    log("⚠️ src/main.jsx missing — React cannot mount.");
  }

  // 4. Validate App.jsx
  const appJsx = path.join(frontendRoot, "src", "App.jsx");
  if (!exists(appJsx)) {
    log("⚠️ src/App.jsx missing — UI root component missing.");
  }

  // 5. Validate dist/ health
  const distPath = path.join(frontendRoot, "dist");
  if (exists(distPath)) {
    const hasIndex = exists(path.join(distPath, "index.html"));
    if (!hasIndex) {
      log("⚠️ dist/ exists but missing index.html → stale or corrupted build.");
    }
  }

  // 6. Validate build command
  try {
    execSync("npm run build --dry-run", {
      cwd: frontendRoot,
      stdio: "ignore",
    });
  } catch (err) {
    log("⚠️ Build pipeline failed dry-run → Vite config or entrypoints may be broken.");
  }

  log("🔵 FrontendBuildIntegrity completed");
}
