// backend/ed/modules/watchdog.js

import http from "http";
import { spawn } from "child_process";
import { runSystemCheck } from "./systemCheck.js";
import { runAutoPatch } from "./autoPatch.js";
import path from "path";

/**
 * Ping the backend /health endpoint
 */
function pingHealth(url) {
  return new Promise((resolve) => {
    http
      .get(url, (res) => {
        if (res.statusCode === 200) resolve(true);
        else resolve(false);
      })
      .on("error", () => resolve(false));
  });
}

/**
 * Start backend process
 */
function startBackend(serverEntry, projectRoot) {
  console.log("🔄 Watchdog: starting backend...");

  return spawn("node", [serverEntry], {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
  });
}

/**
 * Main Watchdog loop
 */
export async function runWatchdog(config, ED_ROOT) {
  console.log("🛡️  ED-Watchdog: starting continuous monitoring...");

  const projectRoot = path.resolve(ED_ROOT, "..", "..");
  const serverEntry = path.join(projectRoot, config.serverEntry);
  const healthUrl = `http://127.0.0.1:4000${config.healthEndpoint}`;

  let backend = startBackend(serverEntry, projectRoot);
  let failureCount = 0;
  const maxFailures = config.maxFailures || 3;
  const interval = config.interval || 10000;
  let hardFailure = false;

  while (!hardFailure) {
    await new Promise((r) => setTimeout(r, interval));
    const healthy = await pingHealth(healthUrl);
    const timestamp = new Date().toISOString();
    if (healthy) {
      console.log(`[${timestamp}] Watchdog: backend healthy.`);
      failureCount = 0;
      continue;
    } else {
      failureCount++;
      console.log(`[${timestamp}] Watchdog: backend unhealthy (failures: ${failureCount}).`);
    }
    if (failureCount >= maxFailures) {
      console.log(`[${timestamp}] Watchdog: running ED-SystemCheck...`);
      const systemOk = await runSystemCheck(config, ED_ROOT);
      if (!systemOk) {
        console.log(`[${timestamp}] Watchdog: running ED-AutoPatch...`);
        await runAutoPatch(config, ED_ROOT);
        // Restart backend
        if (backend && !backend.killed) backend.kill();
        backend = startBackend(serverEntry, projectRoot);
        await new Promise((r) => setTimeout(r, interval));
        const postPatchHealthy = await pingHealth(healthUrl);
        if (!postPatchHealthy) {
          console.log(`[${timestamp}] Watchdog: backend still unhealthy after patch. Escalating to hard failure.`);
          hardFailure = true;
          if (backend && !backend.killed) backend.kill();
          break;
        } else {
          console.log(`[${timestamp}] Watchdog: backend recovered after patch.`);
          failureCount = 0;
        }
      } else {
        console.log(`[${timestamp}] Watchdog: ED-SystemCheck passed, backend still unhealthy.`);
        // Restart backend
        if (backend && !backend.killed) backend.kill();
        backend = startBackend(serverEntry, projectRoot);
        await new Promise((r) => setTimeout(r, interval));
        const postRestartHealthy = await pingHealth(healthUrl);
        if (!postRestartHealthy) {
          console.log(`[${timestamp}] Watchdog: backend still unhealthy after restart. Escalating to hard failure.`);
          hardFailure = true;
          if (backend && !backend.killed) backend.kill();
          break;
        } else {
          console.log(`[${timestamp}] Watchdog: backend recovered after restart.`);
          failureCount = 0;
        }
      }
    }
  }
  console.log(`[${new Date().toISOString()}] Watchdog: hard failure mode. Monitoring stopped.`);
}
