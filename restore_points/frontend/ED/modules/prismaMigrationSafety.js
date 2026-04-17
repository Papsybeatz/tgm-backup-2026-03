// ed/modules/prismaMigrationSafety.js

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export default async function prismaMigrationSafety({ root }) {
  const issues = [];
  const logs = [];

  try {
    const migrationsDir = path.join(root, "prisma/migrations");

    if (!fs.existsSync(migrationsDir)) {
      issues.push("Prisma migrations directory is missing.");
    } else {
      logs.push("Prisma migrations directory found.");
    }

    const dirs = fs.readdirSync(migrationsDir).filter(d => d !== ".DS_Store");

    if (dirs.length === 0) {
      issues.push("No Prisma migrations found. Database cannot be validated.");
    } else {
      logs.push(`Found ${dirs.length} migration(s).`);
    }

    for (const d of dirs) {
      const sqlPath = path.join(migrationsDir, d, "migration.sql");

      if (!fs.existsSync(sqlPath)) {
        issues.push(`Migration ${d} is missing migration.sql.`);
        continue;
      }

      const sql = fs.readFileSync(sqlPath, "utf8").trim();

      if (sql.length < 20 || !sql.includes("CREATE")) {
        issues.push(`Migration ${d} contains incomplete or empty SQL.`);
      } else {
        logs.push(`Migration ${d} contains valid SQL.`);
      }
    }

    try {
      const version = execSync("npx prisma -v").toString();
      logs.push(`Prisma CLI detected: ${version.split("\n")[0]}`);
    } catch (err) {
      issues.push("Prisma CLI not available or failed to execute.");
    }

  } catch (err) {
    issues.push(`Unexpected error: ${err.message}`);
  }

  if (issues.length > 0) {
    return {
      id: "prisma-migration-safety",
      status: "FAIL",
      issues,
      logs,
    };
  }

  return {
    id: "prisma-migration-safety",
    status: "PASS",
    issues: [],
    logs,
  };
}