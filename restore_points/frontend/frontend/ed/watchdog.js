import { exec, spawn } from "child_process";
import fs from "fs";
import path from "path";
import http from "http";

const frontendRoot = path.resolve(process.cwd(), "..");
const logFile = path.join(frontendRoot, "ed", "state", "frontendWatchdog.log");

function log(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `${timestamp} ${message}\n`);
  console.log(message);
}

function checkPort(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(port, () => {
      server.close(() => resolve(false)); // port free
    });
    server.on("error", () => resolve(true)); // port in use
  });
}


function checkFrontendHealth() {
  return new Promise((resolve) => {
    http.get("http://localhost:5173/health.json", (res) => {
      resolve(res.statusCode === 200);
    }).on("error", () => resolve(false));
  });
}

export async function startFrontendWatchdog() {
  log("🟣 FrontendWatchdog started");

  let viteProcess = null;

  async function startVite() {
    log("Starting Vite dev server...");
    viteProcess = spawn("npm", ["run", "dev"], {
      cwd: frontendRoot,
      shell: true,
      stdio: "inherit",
    });

    viteProcess.on("exit", (code) => {
      log(`Vite exited with code ${code}`);
      setTimeout(startVite, 1500);
    });
  }

  if (await checkPort(5173)) {
    log("⚠️ Port 5173 is in use. Killing process...");
    exec("npx kill-port 5173");
  }

  await startVite();

  setInterval(async () => {
    const alive = await checkFrontendHealth();
    if (!alive) {
      log("⚠️ Frontend health endpoint unresponsive. Restarting Vite...");
      viteProcess.kill();
    }
  }, 4000);
}
