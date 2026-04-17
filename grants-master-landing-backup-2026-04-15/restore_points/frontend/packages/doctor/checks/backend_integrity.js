import fs from "node:fs";
import * as path from "node:path";
import { spawn } from "node:child_process";

/**
 * Real backend integrity check.
 * Phases:
 * 1) Structural: paths, files, package.json
 * 2) Static-ish: basic sanity on package.json + entry
 * 3) Optional dry boot: spawn backend and capture boot errors
 */

export async function backend_integrity(ctx = {}) {
  const results = [];
  const errors = [];

  try {
    const backendPath =
      ctx.backendPath ||
      ctx.paths?.backend ||
      ctx.project?.backend ||
      null;

    if (!backendPath) {
      return {
        name: "backend_integrity",
        status: "skip",
        message: "No backend path provided; skipping backend integrity check.",
      };
    }

    const absBackendPath = path.resolve(backendPath);

    // Phase 1: Structural checks
    structuralChecks(absBackendPath, results, errors);

    // Phase 2: Static-ish checks (package.json + entry)
    staticChecks(absBackendPath, results, errors);

    // Phase 3: Optional dry boot
    const dryBootEnabled =
      ctx.options?.backendDryBoot === true ||
      ctx.flags?.backendDryBoot === true;

    if (dryBootEnabled) {
      // eslint-disable-next-line no-await-in-loop
      const bootResult = await dryBootCheck(absBackendPath);
      results.push(bootResult);
      if (bootResult.status === "error") {
        errors.push(bootResult.message || "Backend dry boot failed.");
      }
    }

    const status = errors.length > 0 ? "warn" : "ok";

    return {
      name: "backend_integrity",
      status,
      message:
        status === "ok"
          ? "Backend integrity checks passed."
          : "Backend integrity checks reported issues.",
      details: {
        backendPath: absBackendPath,
        checks: results,
        errors,
      },
    };
  } catch (err) {
    return {
      name: "backend_integrity",
      status: "error",
      message: "Backend integrity check failed unexpectedly.",
      error: err?.message || String(err),
    };
  }
}

/**
 * Phase 1: Structural checks
 */
function structuralChecks(backendRoot, results, errors) {
  // Backend folder exists
  if (!fs.existsSync(backendRoot)) {
    const msg = `Backend directory does not exist: ${backendRoot}`;
    results.push({
      name: "backend_dir_exists",
      status: "error",
      message: msg,
    });
    errors.push(msg);
    return;
  }

  results.push({
    name: "backend_dir_exists",
    status: "ok",
    message: `Backend directory found: ${backendRoot}`,
  });

  // package.json presence
  const pkgPath = path.join(backendRoot, "package.json");
  if (!fs.existsSync(pkgPath)) {
    const msg = `Missing package.json in backend: ${pkgPath}`;
    results.push({
      name: "backend_package_json_exists",
      status: "warn",
      message: msg,
    });
    errors.push(msg);
  } else {
    results.push({
      name: "backend_package_json_exists",
      status: "ok",
      message: "package.json found in backend.",
    });
  }

  // Common entry candidates
  const entryCandidates = ["server.js", "index.js", "app.js"];
  const foundEntry = entryCandidates.find((f) =>
    fs.existsSync(path.join(backendRoot, f))
  );

  if (!foundEntry) {
    const msg = `No backend entry file found. Tried: ${entryCandidates.join(
      ", "
    )}`;
    results.push({
      name: "backend_entry_exists",
      status: "warn",
      message: msg,
    });
    errors.push(msg);
  } else {
    results.push({
      name: "backend_entry_exists",
      status: "ok",
      message: `Backend entry file detected: ${foundEntry}`,
      details: { entry: foundEntry },
    });
  }
}

/**
 * Phase 2: Static-ish checks
 */
function staticChecks(backendRoot, results, errors) {
  const pkgPath = path.join(backendRoot, "package.json");
  if (!fs.existsSync(pkgPath)) {
    // Already reported in structural; nothing more to do here.
    return;
  }

  try {
    const raw = fs.readFileSync(pkgPath, "utf8");
    const pkg = JSON.parse(raw);

    // Basic sanity: name, scripts, dependencies
    if (!pkg.name) {
      const msg = "Backend package.json is missing a 'name' field.";
      results.push({
        name: "backend_package_name",
        status: "warn",
        message: msg,
      });
      errors.push(msg);
    } else {
      results.push({
        name: "backend_package_name",
        status: "ok",
        message: `Backend package name: ${pkg.name}`,
      });
    }

    if (!pkg.scripts || (!pkg.scripts.start && !pkg.scripts.dev)) {
      const msg =
        "Backend package.json has no 'start' or 'dev' script defined.";
      results.push({
        name: "backend_scripts_defined",
        status: "warn",
        message: msg,
      });
      errors.push(msg);
    } else {
      results.push({
        name: "backend_scripts_defined",
        status: "ok",
        message: "Backend start/dev scripts are defined.",
        details: { scripts: pkg.scripts },
      });
    }
  } catch (err) {
    const msg = `Failed to parse backend package.json: ${
      err?.message || String(err)
    }`;
    results.push({
      name: "backend_package_json_parse",
      status: "error",
      message: msg,
    });
    errors.push(msg);
  }
}

/**
 * Phase 3: Optional dry boot
 * Spawns `node <entry>` and captures immediate boot errors.
 */
async function dryBootCheck(backendRoot) {
  const entryCandidates = ["server.js", "index.js", "app.js"];
  const entry = entryCandidates.find((f) =>
    fs.existsSync(path.join(backendRoot, f))
  );

  if (!entry) {
    return {
      name: "backend_dry_boot",
      status: "skip",
      message:
        "No backend entry file found for dry boot; skipping dry boot phase.",
    };
  }

  const entryPath = path.join(backendRoot, entry);

  return new Promise((resolve) => {
    const child = spawn("node", [entryPath], {
      cwd: backendRoot,
      env: {
        ...process.env,
        // You can add safe overrides here if needed
        NODE_ENV: process.env.NODE_ENV || "development",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    let stdout = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    // Give it a short window to boot, then kill
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
    }, 3000);

    child.on("exit", (code) => {
      clearTimeout(timeout);

      if (code === 0) {
        resolve({
          name: "backend_dry_boot",
          status: "ok",
          message: "Backend dry boot completed without immediate errors.",
          details: {
            entry: entryPath,
            stdout: trimOutput(stdout),
          },
        });
      } else {
        resolve({
          name: "backend_dry_boot",
          status: "error",
          message: "Backend dry boot reported errors.",
          details: {
            entry: entryPath,
            exitCode: code,
            stderr: trimOutput(stderr),
            stdout: trimOutput(stdout),
          },
        });
      }
    });

    child.on("error", (err) => {
      clearTimeout(timeout);
      resolve({
        name: "backend_dry_boot",
        status: "error",
        message: `Failed to spawn backend process: ${
          err?.message || String(err)
        }`,
      });
    });
  });
}

function trimOutput(str, maxLen = 2000) {
  if (!str) return "";
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "\n...[truncated]...";
}
