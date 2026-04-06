// ed/modules/frontendGuardianEntry.js
import { runFrontendInstallDoctor } from "./frontendInstallDoctor.js";
import { spawn } from "child_process";
import path from "path";

const FG_TAG = "[FrontendGuardian]";

function log(...args) {
  console.log(FG_TAG, ...args);
}

const PROJECT_ROOT = path.resolve(process.cwd());
const FRONTEND_DIR = path.join(PROJECT_ROOT, "frontend");

function spawnNodeScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [scriptPath, ...args], {
      cwd: PROJECT_ROOT,
      shell: true,
      stdio: "pipe",
    });

    child.stdout.on("data", (data) => {
      log(`[script stdout] ${data.toString().trim()}`);
    });

    child.stderr.on("data", (data) => {
      log(`[script stderr] ${data.toString().trim()}`);
    });

    child.on("error", (err) => {
      log("Script spawn error:", err);
      reject(err);
    });

    child.on("close", (code) => {
      log(`Script exited with code: ${code}`);
      if (code === 0) resolve(true);
      else reject(new Error(`Script failed with exit code ${code}`));
    });
  });
}

async function runBuildIntegrityCheck() {
  const scriptPath = path.join("frontend", "scripts", "checkBuildIntegrity.mjs");
  log("Running build integrity check...");
  await spawnNodeScript(scriptPath);
  log("Build integrity check passed.");
}

function createGuardianResult() {
  return {
    status: "healthy",
    envDoctor: null,
    buildChecked: false,
    errors: [],
  };
}

export async function runFrontendGuardian({ checkBuild = false } = {}) {
  const result = createGuardianResult();
  log("🚀 Starting unified Frontend Guardian...");

  try {
    log("🩺 Running Frontend Install Doctor (FID)...");
    const fidResult = await runFrontendInstallDoctor();
    result.envDoctor = fidResult;

    if (fidResult.status === "failed") {
      result.status = "failed";
      result.errors.push("envDoctorFailed");
      printUnifiedCertificate(result);
      return result;
    }

    if (fidResult.status === "repaired") {
      result.status = "repaired";
    }

    if (checkBuild) {
      try {
        await runBuildIntegrityCheck();
        result.buildChecked = true;
      } catch (err) {
        log("Build integrity check failed:", err);
        result.status = "failed";
        result.errors.push("buildIntegrityFailed");
        printUnifiedCertificate(result);
        return result;
      }
    }

    if (result.status === "healthy") {
      result.status = fidResult.status;
    }

    printUnifiedCertificate(result);
    return result;
  } catch (err) {
    log("Unexpected Frontend Guardian error:", err);
    result.status = "failed";
    result.errors.push("unexpectedGuardianError");
    printUnifiedCertificate(result);
    return result;
  }
}

function printUnifiedCertificate(result) {
  const { status, envDoctor, buildChecked, errors } = result;

  console.log("--------------------------------------------------");
  if (status === "healthy") {
    console.log("🟢 Frontend Guardian: ALL CHECKS PASSED");
  } else if (status === "repaired") {
    console.log("🟡 Frontend Guardian: REPAIRS APPLIED");
  } else {
    console.log("🔴 Frontend Guardian: FAILED");
  }

  if (envDoctor) {
    console.log("");
    console.log("Env Doctor (FID) status:", envDoctor.status);
    if (envDoctor.issues?.length) {
      console.log(" - Issues:", envDoctor.issues);
    }
    if (envDoctor.repairs?.length) {
      console.log(" - Repairs:", envDoctor.repairs);
    }
    if (envDoctor.errors?.length) {
      console.log(" - Errors:", envDoctor.errors);
    }
  }

  console.log("");
  console.log("Build integrity checked:", buildChecked ? "yes" : "no");

  if (errors.length > 0) {
    console.log("");
    console.log("Guardian errors:");
    errors.forEach((e) => console.log(" -", e));
  }

  console.log("--------------------------------------------------");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const checkBuild = args.includes("--check-build");

  runFrontendGuardian({ checkBuild }).then((res) => {
    if (res.status === "failed") {
      process.exitCode = 1;
    }
  });
}
