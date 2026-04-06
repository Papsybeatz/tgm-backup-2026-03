import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const frontendRoot = path.resolve(process.cwd(), "..");
const stateDir = path.join(frontendRoot, "ed", "state");
if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });

const logFile = path.join(stateDir, "autoPatch.log");

function log(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `${timestamp} ${message}\n`);
  console.log(message);
}

function exists(p) {
  return fs.existsSync(p);
}

function writeFile(p, content) {
  fs.writeFileSync(p, content, "utf8");
  log(`Patched: ${p}`);
}

export function runFrontendAutoPatch() {
  log("🟢 FrontendAutoPatch started");

  // 1. Ensure src/ structure
  const folders = ["src", "src/components", "src/routes"];
  for (const folder of folders) {
    const full = path.join(frontendRoot, folder);
    if (!exists(full)) {
      fs.mkdirSync(full, { recursive: true });
      log(`Created missing folder: ${folder}`);
    }
  }

  // 2. Ensure index.html
  const indexHtml = path.join(frontendRoot, "index.html");
  if (!exists(indexHtml)) {
    writeFile(
      indexHtml,
      `<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"UTF-8\" />\n    <title>TGM</title>\n  </head>\n  <body>\n    <div id=\"root\"></div>\n    <script type=\"module\" src=\"/src/main.jsx\"></script>\n  </body>\n</html>`
    );
  }

  // 3. Ensure vite.config.js
  const viteConfig = path.join(frontendRoot, "vite.config.js");
  if (!exists(viteConfig)) {
    writeFile(
      viteConfig,
      `import { defineConfig } from \"vite\";\nimport react from \"@vitejs/plugin-react\";\n\nexport default defineConfig({\n  plugins: [react()],\n  server: { port: 5173 },\n});`
    );
  }

  // 4. Ensure main.jsx
  const mainJsx = path.join(frontendRoot, "src", "main.jsx");
  if (!exists(mainJsx)) {
    writeFile(
      mainJsx,
      `import React from \"react\";\nimport ReactDOM from \"react-dom/client\";\nimport App from \"./App.jsx\";\n\nReactDOM.createRoot(document.getElementById(\"root\")).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);`
    );
  }

  // 5. Ensure App.jsx
  const appJsx = path.join(frontendRoot, "src", "App.jsx");
  if (!exists(appJsx)) {
    writeFile(
      appJsx,
      `export default function App() {\n  return <div>TGM Frontend Running</div>;\n}`
    );
  }

  // 6. Ensure GrantsMasterVite/.env + VITE_API_URL
  const envPath = path.join(frontendRoot, "../.env");
  if (!exists(envPath)) {
    writeFile(envPath, `VITE_API_URL=http://localhost:4000\nVITE_STRIPE_PUBLIC_KEY=pk_test_123`);
  } else {
    const env = fs.readFileSync(envPath, "utf8");
    let updated = false;
    if (!env.includes("VITE_API_URL")) {
      fs.appendFileSync(envPath, `\nVITE_API_URL=http://localhost:4000`);
      updated = true;
    }
    if (!env.includes("VITE_STRIPE_PUBLIC_KEY")) {
      fs.appendFileSync(envPath, `\nVITE_STRIPE_PUBLIC_KEY=pk_test_123`);
      updated = true;
    }
    if (updated) log("Updated GrantsMasterVite/.env with missing VITE variables");
  }

  // 7. Ensure public/health.json with fresh timestamp
  const healthPath = path.join(frontendRoot, "public", "health.json");
  if (!exists(healthPath)) {
    writeFile(
      healthPath,
      JSON.stringify(
        {
          status: "ok",
          service: "tgm-frontend",
          timestamp: new Date().toISOString()
        },
        null,
        2
      )
    );
  } else {
    const health = JSON.parse(fs.readFileSync(healthPath, "utf8"));
    health.timestamp = new Date().toISOString();
    writeFile(healthPath, JSON.stringify(health, null, 2));
  }

  // 7. Clear stale dist/
  const distPath = path.join(frontendRoot, "dist");
  if (exists(distPath)) {
    fs.rmSync(distPath, { recursive: true, force: true });
    log("Cleared stale dist/ folder");
  }

  // 8. Ensure node_modules
  const nodeModules = path.join(frontendRoot, "node_modules");
  if (!exists(nodeModules)) {
    log("node_modules missing — reinstalling dependencies...");
    execSync("npm install", { cwd: frontendRoot, stdio: "inherit" });
  }

  log("🟢 FrontendAutoPatch completed");
}
