// ED/modules/backend-integrity-core.js

import fs from "fs";
import { normalizeProjectRoot, normalizeBackendPath } from "../utils/normalizePaths.js";
export default {
  id: "backend-integrity-core",
  description: "Core backend integrity: path resolution, server.js checks, CORS, cookies.",

  async scan(context, options = {}) {
    const { projectRoot, backendRoot, frontendRoot } = context;
    const logs = [];
    const issues = [];
    const checks = {};

    // Check backendRoot
    logs.push("Checking backendRoot...");
    checks.backendPathResolved = !!backendRoot;
    if (!backendRoot) issues.push("backend_path_missing");

    // Check backendRoot exists
    if (backendRoot && !fs.existsSync(backendRoot)) {
      issues.push("backend_path_missing");
      logs.push("backendRoot does not exist: " + backendRoot);
      checks.backendFolderExists = false;
    } else if (backendRoot) {
      checks.backendFolderExists = true;
    }

    // Check server.js
    let serverFile;
    if (backendRoot) {
      serverFile = backendRoot.endsWith("/") ? backendRoot + "server.js" : backendRoot + "/server.js";
      if (!fs.existsSync(serverFile)) {
        issues.push("server_js_missing");
        logs.push("server.js missing at: " + serverFile);
        checks.serverJsFound = false;
      } else {
        checks.serverJsFound = true;
        logs.push("scanned server.js (3 checks)");
        const serverContent = fs.readFileSync(serverFile, "utf8");
        // cookie-parser
        checks.cookieParserPresent = serverContent.includes("cookie-parser") || serverContent.includes("cookieParser");
        if (!checks.cookieParserPresent) {
          issues.push("missing_cookie_parser");
          logs.push("cookie-parser not found in server.js");
        }
        // CORS
        checks.corsMiddlewarePresent = serverContent.includes("cors(") || serverContent.includes("app.use(cors(");
        if (!checks.corsMiddlewarePresent) {
          issues.push("missing_cors");
          logs.push("CORS middleware not found in server.js");
        }
        // credentials: true
        checks.corsCredentialsTrue = serverContent.includes("credentials: true");
        if (!checks.corsCredentialsTrue) {
          issues.push("missing_cors_credentials");
          logs.push("CORS credentials: true not found in server.js");
        }
        // cookie options
        checks.secureCookieOptions = !(
          serverContent.includes("res.cookie(") &&
          (!serverContent.includes("httpOnly: true") ||
            (!serverContent.includes("sameSite: \"lax\"") &&
             !serverContent.includes("sameSite: \"strict\"")))
        );
        if (!checks.secureCookieOptions) {
          issues.push("weak_cookie_options");
          logs.push("Weak cookie options detected in server.js");
        }
      }
    }

    return {
      id: "backend-integrity-core",
      status: issues.length ? "warn" : "ok",
      paths: { projectRoot, backendRoot, frontendRoot },
      checks,
      issues,
      logs
    };
  },

  async fix() {
    return { skipped: true };
  }
};

