import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";

export async function frontendInstallDoctor(projectPath) {
  const log = (...args) => console.log("[FID]", ...args);

  const npm = (cmd) => execSync(cmd, { cwd: projectPath, stdio: "pipe" }).toString();

  const exists = (p) => fs.existsSync(path.join(projectPath, p));

  log("Starting Frontend Install Doctor...");

  // 1. Kill stale node processes
  try {
    execSync("taskkill /F /IM node.exe");
    log("Killed stale node processes.");
  } catch {}

  // 2. Detect drift
  const drift =
    exists("node_modules") &&
    exists("frontend/node_modules");

  // 3. Detect missing vite binary
  const viteMissing = !exists("node_modules/.bin/vite");

  // 4. Detect corrupted lockfile
  const corrupt =
    exists("package-lock.json") && viteMissing;

  // 5. Detect stalled npm install
  const stalled = await new Promise((resolve) => {
    const child = spawn("npm", ["install"], { cwd: projectPath });
    let outputSeen = false;

    child.stdout.on("data", () => (outputSeen = true));
    child.stderr.on("data", () => (outputSeen = true));

    setTimeout(() => {
      if (!outputSeen) {
        child.kill();
        resolve(true);
      } else resolve(false);
    }, 45000);
  });

  // 6. Auto-repair
  if (drift || corrupt || stalled || viteMissing) {
    log("Detected issues:", { drift, corrupt, stalled, viteMissing });

    log("Cleaning environment...");
    try { npm("npm cache clean --force"); } catch {}
    try { fs.rmSync(path.join(projectPath, "node_modules"), { recursive: true, force: true }); } catch {}
    try { fs.rmSync(path.join(projectPath, "package-lock.json"), { force: true }); } catch {}

    log("Reinstalling dependencies...");
    npm("npm install --no-audit --prefer-offline");
  }

  // 7. Ensure vite exists
  if (!exists("node_modules/.bin/vite")) {
    log("Vite still missing. Installing directly...");
    npm("npm install -D vite");
  }

  // 8. Verify dev server boots
  log("Testing Vite dev server...");
  try {
    execSync("npx vite --host 127.0.0.1", { cwd: projectPath, timeout: 15000 });
    log("Frontend boots successfully.");
    return { ok: true };
  } catch (err) {
    log("Dev server failed:", err.message);
    return { ok: false, error: err.message };
  }
}
