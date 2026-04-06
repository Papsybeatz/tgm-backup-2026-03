// backend/ed/systemCheck.js
import path from "path";
import { ED_MODULES } from "./registry.js";

export async function runAllEdChecks() {
  const results = [];

  const ctx = {
    backendRoot: path.resolve(process.cwd(), "backend"),
    frontendRoot: path.resolve(process.cwd(), "frontend"),
    logger: console
  };

  for (const mod of ED_MODULES) {
    try {
      if (!mod || typeof mod.run !== "function") {
        results.push({
          id: mod?.id || "unknown",
          status: "fail",
          errorType: "invalid_module",
          message: "Module has no run() method"
        });
        continue;
      }

      const result = await mod.run(ctx);
      results.push({
        id: mod.id || "unknown",
        status: result.status || "unknown",
        ...result
      });

    } catch (err) {
      results.push({
        id: mod?.id || "unknown",
        status: "fail",
        errorType: "module_runtime_error",
        message: err.message
      });
    }
  }

  return results;
}
  const envPath = path.join(backendRoot, ".env");
  if (!exists(envPath)) {
    warn(
      ".env file missing",
      "Create backend/.env with DATABASE_URL. ED will continue but DB operations may fail."
    );
  }

  let databaseUrl = "";
  if (exists(envPath)) {
    const env = fs.readFileSync(envPath, "utf8");
    const match = env.match(/DATABASE_URL\s*=\s*"(.*)"/);
    if (match) databaseUrl = match[1];
    if (!databaseUrl) {
      warn(
        "DATABASE_URL missing or empty",
        "Add DATABASE_URL to .env. Example: DATABASE_URL=\"file:./dev.db\""
      );
    }
  }

  // 4. Validate Prisma client integrity
  const clientPath = path.join(backendRoot, "node_modules", "@prisma", "client");
  const requiredClientFiles = ["index.js", "runtime", "package.json"];

  for (const file of requiredClientFiles) {
    if (!exists(path.join(clientPath, file))) {
      warn(
        `Prisma client missing: ${file}`,
        "Run: npm install @prisma/client && npx prisma generate"
      );
    }
  }

  // 5. Validate ESM configuration
  const pkgPath = path.join(backendRoot, "package.json");
  if (exists(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    if (pkg.type !== "module") {
      warn(
        `package.json missing \"type\": \"module\"`,
        `Add \"type\": \"module\" to backend/package.json to ensure ESM imports work correctly.`
      );
    }
  }

  // 6. Validate server.js bootability
  const serverPath = path.join(backendRoot, "server.js");
  if (!exists(serverPath)) {
    warn(
      "server.js missing",
      "Restore server.js. Backend cannot start without it."
    );
  } else {
    try {
      await import(serverPath);
    } catch (err) {
      warn(
        `server.js failed to import: ${err.message}`,
        "Fix the import error. ED will continue but backend may crash."
      );
    }
  }

  // 7. Validate health endpoint
  const healthPath = path.join(backendRoot, "routes", "health.js");
  if (!exists(healthPath)) {
    warn(
      "Missing /health endpoint",
      "Add a health route so ED can monitor backend stability."
    );
  }

  log("SystemCheck completed");
  console.log("🛠️ ED-SystemCheck: Completed.\n");
  return true;
}
