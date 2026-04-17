

// GrantsMasterVite/backend/ed/cli.mjs
import { runSystemCheck } from "./modules/systemCheck.js";
import { verifyBackendBoot } from "./modules/backendBootIntegrity.js";
import { edSweep } from "./edSweep.js";
import { EDConfig } from "./loadConfig.mjs";

const args = process.argv.slice(2);

if (args.includes("sweep")) {
  console.log("ED: Running full integrity sweep...");
  await edSweep(EDConfig);
  process.exit(0);
}

if (args.includes("health")) {
  console.log("ED: Running ED-SystemCheck...");
  const ok = await runSystemCheck(EDConfig);
  if (!ok) {
    console.log("ED health check completed.");
    process.exit(1);
  }

  // Backend boot integrity check (assumes backend is running)
  const bootOk = await verifyBackendBoot({ port: 4000 });
  if (!bootOk) {
    console.error("❌ ED: Backend boot integrity failed.");
    process.exit(1);
  }

  console.log("✅ ED: Full backend integrity pipeline passed.");
  process.exit(0);
}

console.log("ED: No valid command provided. Use 'sweep' or 'health'.");
