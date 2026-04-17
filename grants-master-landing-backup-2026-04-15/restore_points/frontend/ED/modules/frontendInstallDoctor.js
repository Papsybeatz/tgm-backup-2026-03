import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(process.cwd());
const FRONTEND_DIR = path.join(PROJECT_ROOT, "frontend");
const NODE_MODULES_DIR = path.join(PROJECT_ROOT, "node_modules");
const PACKAGE_JSON = path.join(PROJECT_ROOT, "package.json");
const LOCKFILE = path.join(PROJECT_ROOT, "package-lock.json");

const FID_TAG = "[FID]";

function log(...args) {
  console.log(FID_TAG, ...args);
}

function fileExists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function dirExists(p) {
  try {
    return fs.existsSync(p) && fs.lstatSync(p).isDirectory();
  } catch {
    return false;
  }
}

function spawnWithLogs(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      shell: true,
      stdio: "pipe",
      ...options,
    });

    child.stdout.on("data", (data) => {
      log(`[spawn stdout] ${data.toString().trim()}`);
    });

    child.stderr.on("data", (data) => {
      log(`[spawn stderr] ${data.toString().trim()}`);
    });

    child.on("error", (err) => {
      log("Spawn error:", err);
      reject(err);
    });

    child.on("close", (code) => {
      log(`Spawn exited with code: ${code}`);
      if (code === 0) resolve(true);
      else reject(new Error(`Process failed with exit code ${code}`));
    });
  });
}

async function reinstallDependencies(projectPath) {
  log("Reinstalling dependencies with full logging...");
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  await spawnWithLogs(npmCmd, ["install"], { cwd: projectPath });
  log("Reinstall complete.");
}

async function verifyViteBinary(projectPath) {
  log("Verifying Vite binary with `npx vite --version`...");
  const npmCmd = process.platform === "win32" ? "npx.cmd" : "npx";
  await spawnWithLogs(npmCmd, ["vite", "--version"], { cwd: projectPath });
  log("Vite binary verification passed.");
}

async function dryRunViteHelp(projectPath) {
  log("Running dry-run `vite --help` to ensure CLI is functional...");
  const npmCmd = process.platform === "win32" ? "npx.cmd" : "npx";
  await spawnWithLogs(npmCmd, ["vite", "--help"], { cwd: projectPath });
  log("Vite dry-run help passed.");
}

function detectIssues() {
  const issues = [];
  let drift = false;
  let corrupt = false;
  let stalled = false;
  let viteMissing = false;

  if (!fileExists(PACKAGE_JSON)) {
    corrupt = true;
    issues.push("Missing package.json");
  }

  if (!dirExists(NODE_MODULES_DIR)) {
    drift = true;
    issues.push("node_modules directory missing");
  }

  if (!fileExists(LOCKFILE)) {
    drift = true;
    issues.push("Lockfile (package-lock.json) missing");
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, "utf8"));
    const hasViteDep =
      (pkg.devDependencies && pkg.devDependencies.vite) ||
      (pkg.dependencies && pkg.dependencies.vite);
    if (!hasViteDep) {
      viteMissing = true;
      issues.push("Vite dependency missing from package.json");
    }
  } catch {
    corrupt = true;
    issues.push("Unable to read or parse package.json");
  }

  stalled = false;

  return {
    drift,
    corrupt,
    stalled,
    viteMissing,
    issues,
  };
}

function cleanEnvironment() {
  log("Cleaning environment...");

  if (dirExists(NODE_MODULES_DIR)) {
    log("Removing node_modules...");
    fs.rmSync(NODE_MODULES_DIR, { recursive: true, force: true });
  }

  if (fileExists(LOCKFILE)) {
    log("Removing package-lock.json...");
    fs.rmSync(LOCKFILE, { force: true });
  }

  log("Environment cleanup complete.");
}

export async function runFrontendInstallDoctor() {
  const start = Date.now();
  const result = {
    status: "healthy",
    issues: [],
    repairs: [],
    errors: [],
    timeMs: 0,
  };

  log("Starting Frontend Install Doctor...");

  try {
    const detection = detectIssues();
    log("Detected issues:", detection);

    const needsRepair =
      detection.drift ||
      detection.corrupt ||
      detection.stalled ||
      detection.viteMissing;

    if (!needsRepair) {
      log("No repairs needed. Frontend environment is healthy.");
      result.status = "healthy";
      result.timeMs = Date.now() - start;
      printHealthCertificate(result);
      return result;
    }

    result.issues.push(...detection.issues);

    cleanEnvironment();
    result.repairs.push("environmentCleaned");

    try {
      await reinstallDependencies(PROJECT_ROOT);
      result.repairs.push("dependenciesReinstalled");
    } catch (err) {
      log("npm install failed:", err);
      result.status = "failed";
      result.errors.push("npmInstallFailed");
      result.timeMs = Date.now() - start;
      printHealthCertificate(result);
      return result;
    }

    try {
      await verifyViteBinary(PROJECT_ROOT);
    } catch (err) {
      log("Vite binary verification failed:", err);
      result.status = "failed";
      result.errors.push("viteMissing");
      result.timeMs = Date.now() - start;
      printHealthCertificate(result);
      return result;
    }

    try {
      await dryRunViteHelp(PROJECT_ROOT);
    } catch (err) {
      log("Vite dry-run help failed:", err);
      result.status = "failed";
      result.errors.push("viteDryRunFailed");
      result.timeMs = Date.now() - start;
      printHealthCertificate(result);
      return result;
    }

    result.status = "repaired";
    result.timeMs = Date.now() - start;
    printHealthCertificate(result);
    return result;
  } catch (err) {
    log("Unexpected FID error:", err);
    result.status = "failed";
    result.errors.push("unexpectedError");
    result.timeMs = Date.now() - start;
    printHealthCertificate(result);
    return result;
  }
}

function printHealthCertificate(result) {
  const { status, issues, repairs, errors, timeMs } = result;

  log("--------------------------------------------------");
  if (status === "healthy") {
    log("🟢 Frontend Environment Integrity: PASSED");
    if (issues.length > 0) {
      log("Warnings:", issues);
    } else {
      log("No repairs were needed.");
    }
  } else if (status === "repaired") {
    log("🟡 Frontend Environment Integrity: REPAIRED");
    if (repairs.length > 0) {
      log("Repairs applied:");
      repairs.forEach((r) => log(" -", r));
    }
    if (issues.length > 0) {
      log("Initial issues:");
      issues.forEach((i) => log(" -", i));
    }
  } else {
    log("🔴 Frontend Environment Integrity: FAILED");
    if (errors.length > 0) {
      log("Errors:");
      errors.forEach((e) => log(" -", e));
    }
    if (issues.length > 0) {
      log("Detected issues:");
      issues.forEach((i) => log(" -", i));
    }
  }
  log(`⏱️  FID runtime: ${timeMs} ms`);
  log("--------------------------------------------------");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runFrontendInstallDoctor().then(() => {
    // no-op; result already logged
  });
}
