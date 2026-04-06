

import fs from "fs";
import path from "path";
import { ED_CONFIG } from "../registry.js";

// Export exactly one default function, all logic inside
export default async function backendBootIntegrity({ root }) {
  // Use ED_CONFIG for backendRoot
  const projectRoot = root;
  const backendRoot = path.join(root, ED_CONFIG.backendRoot);
  const logs = [];
  const issues = [];
  const checks = {};

  // Check backendRoot
  checks.backendPathResolved = !!backendRoot;
  if (!backendRoot || !fs.existsSync(backendRoot)) {
    issues.push("backend_path_missing");
    logs.push("backendRoot missing or does not exist: " + backendRoot);
  } else {
    logs.push("resolved backendRoot: " + backendRoot);
  }

  // Check server.js
  let serverFile;
  if (backendRoot) {
    serverFile = backendRoot.endsWith("/") ? backendRoot + "server.js" : backendRoot + "/server.js";
    checks.serverJsFound = fs.existsSync(serverFile);
    if (!checks.serverJsFound) {
      issues.push("server_js_missing");
      logs.push("server.js missing at: " + serverFile);
    } else {
      logs.push("scanned server.js");
    }
  }

  return {
    id: "backend-boot-integrity",
    description: "Checks whether the backend is structurally bootable (server.js present at backendPath).",
    status: issues.length ? "warn" : "ok",
    paths: { projectRoot, backendRoot },
    checks,
    issues,
    logs
  };
}
