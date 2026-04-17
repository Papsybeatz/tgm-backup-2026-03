// ED/modules/auth-boundary-integrity.js

import fs from "fs";
import { normalizeProjectRoot, normalizeBackendPath } from "../utils/normalizePaths.js";

export default {
  id: "auth-boundary-integrity",
  description: "Checks authentication boundary: session, cookies, login/logout endpoints.",
  async scan(context, options = {}) {
      const { backendRoot } = context;
      const logs = [];
      const issues = [];
      const checks = {};

      // Check backendRoot
      checks.backendPathResolved = !!backendRoot;
      if (!backendRoot) {
        issues.push("backend_path_missing");
        logs.push("backendRoot missing or invalid: " + backendRoot);
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
          const serverContent = fs.readFileSync(serverFile, "utf8");
          // session middleware
          checks.sessionMiddlewarePresent = serverContent.includes("express-session") || serverContent.includes("session({");
          if (!checks.sessionMiddlewarePresent) {
            issues.push("missing_session_middleware");
            logs.push("Session middleware not found in server.js");
          }
          // login endpoint
           checks.loginEndpointPresent = /app\.post\(['"]\/api\/login['"]\)/.test(serverContent);
          if (!checks.loginEndpointPresent) {
            issues.push("missing_login_endpoint");
            logs.push("Login endpoint not found in server.js");
          }
          // logout endpoint
           checks.logoutEndpointPresent = /app\.post\(['"]\/api\/logout['"]\)/.test(serverContent);
          if (!checks.logoutEndpointPresent) {
            issues.push("missing_logout_endpoint");
            logs.push("Logout endpoint not found in server.js");
          }
        }
      }

      return {
        id: "auth-boundary-integrity",
        status: issues.length ? "warn" : "ok",
        paths: { backendRoot },
        checks,
        issues,
        logs
      };
    }
};
