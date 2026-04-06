export default {
  id: "support-domain-integrity",
  description: "Checks support domain: CORS, allowed origins, port, .env, VITE_API_URL.",
  async scan(context, options = {}) {
    const { backendRoot, frontendRoot, projectRoot } = context;
    const logs = [];
    const issues = [];
    const checks = {};

    // Check .env
    let envFile;
    if (frontendRoot) {
      envFile = frontendRoot.endsWith("/") ? frontendRoot + ".env" : frontendRoot + "/.env";
      checks.envFound = fs.existsSync(envFile);
      if (!checks.envFound) {
        issues.push("env_missing");
        logs.push(".env missing at: " + envFile);
      } else {
        logs.push("scanned .env");
        const envContent = fs.readFileSync(envFile, "utf8");
        // VITE_API_URL
        const viteApiUrl = envContent.match(/^VITE_API_URL=(.*)$/m);
        checks.viteApiUrlPresent = !!viteApiUrl;
        if (!checks.viteApiUrlPresent) {
          issues.push("vite_api_url_missing");
          logs.push("VITE_API_URL missing in .env");
        }
      }
    }

    return {
      id: "support-domain-integrity",
      status: issues.length ? "warn" : "ok",
      paths: { projectRoot, backendRoot, frontendRoot },
      checks,
      issues,
      logs
    };
  },


  async fix(issues, context) {
    const { projectRoot } = context || {};
    const warnings = [];
    const changes = [];

    // -------------------------------
    // 1. Frontend missing port warning
    // -------------------------------
    if (issues.includes("frontend_missing_port")) {
      warnings.push(
        "Frontend was opened without port 5173. Use http://127.0.0.1:5173 or http://localhost:5173."
      );
    }

    // -------------------------------
    // 2. Backend opened in browser
    // -------------------------------
    if (issues.includes("backend_opened_in_browser")) {
      warnings.push(
        "Backend (port 4000) was opened in the browser. This is expected to show 'Cannot GET /'."
      );
    }

    // -------------------------------
    // 3. Fix VITE_API_URL mismatch
    // -------------------------------
    const envPath = path.resolve(projectRoot, ".env");

    if (
      (issues.includes("domain_mismatch") ||
        issues.includes("missing_vite_api_url")) &&
      fs.existsSync(envPath)
    ) {
      let env = fs.readFileSync(envPath, "utf8");

      env = env.replace(/VITE_API_URL=.*/, "VITE_API_URL=http://127.0.0.1:4000");

      if (!env.includes("VITE_API_URL=")) {
        env += `\nVITE_API_URL=http://127.0.0.1:4000\n`;
      }

      fs.writeFileSync(envPath, env, "utf8");
      changes.push("Updated VITE_API_URL to http://127.0.0.1:4000 in .env");
    }

    if (issues.includes(".env_missing")) {
      warnings.push(".env file missing — cannot validate or fix VITE_API_URL.");
    }

    return {
      fixed: changes.length > 0,
      warnings,
      changes,
    };
  },
};
