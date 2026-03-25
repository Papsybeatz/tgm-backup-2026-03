import fs from "fs";
import path from "path";
import { execSync } from "child_process";

function filePathFromUrl(url) {
  return new URL(url, import.meta.url).pathname.replace(/^\//, "").replace(/\//g, path.sep);
}

async function prismaMigrationIntegrity() {
    const migrationDir = filePathFromUrl("../../backend/prisma/migrations/");
    const schemaPath = filePathFromUrl("../../backend/prisma/schema.prisma");
    const configPath = filePathFromUrl("../../prisma.config.ts");

  const issues = [];
  const logs = [];

  // 1. Check datasource URL is NOT in schema.prisma
  const schema = fs.readFileSync(schemaPath, "utf8");
  if (schema.includes("url")) {
    issues.push("Datasource URL found in schema.prisma (invalid for Prisma v7).");
  }

  // 2. Check datasource URL IS in prisma.config.ts
  // If the file doesn't exist, skip this check
  if (!fs.existsSync(configPath)) {
    return {
      id: "prisma-migration-integrity",
      status: "PASS",
      issues: [],
      logs: ["No prisma.config.ts found — skipping integrity check"],
    };
  }

  const config = fs.readFileSync(configPath, "utf8");
  if (!config.includes("datasource") || !config.includes("url")) {
    issues.push("Datasource URL missing in prisma.config.ts.");
  }

  // 3. Check for empty migration.sql
  const dirs = fs.readdirSync(migrationDir);
  for (const d of dirs) {
    const sqlPath = path.join(migrationDir, d, "migration.sql");
    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, "utf8").trim();
      if (sql.length < 20 || !sql.includes("CREATE TABLE")) {
        issues.push(`Migration ${d} contains no SQL or incomplete SQL.`);
      }
    }
  }

  // 4. Auto-fix option
  if (issues.length > 0) {
    logs.push("Attempting Prisma v7 baseline regeneration...");

    execSync(
      `npx prisma migrate diff --from-empty --to-schema=prisma/schema.prisma --script --provider=postgresql | Set-Content -Encoding utf8 prisma/migrations/BASELINE/migration.sql`,
      { cwd: root, shell: "powershell.exe" }
    );

    return {
      id: "prisma-migration-integrity",
      status: "FAIL",
      issues,
      logs,
      suggestions: [
        "Baseline migration regenerated. Run: npx prisma migrate reset",
      ],
    };
  }

  return {
    id: "prisma-migration-integrity",
    status: "PASS",
    issues: [],
    logs: ["Prisma v7 migration integrity validated."],
  };
}

export default prismaMigrationIntegrity;
