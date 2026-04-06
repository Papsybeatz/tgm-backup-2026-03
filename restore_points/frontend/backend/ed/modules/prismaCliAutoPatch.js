// prismaCliAutoPatch.js
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export function ensurePrismaCLI({ projectRoot }) {
  const backendDir = path.join(projectRoot, "backend");
  try {
    execSync("npx prisma --version", {
      cwd: backendDir,
      stdio: "ignore"
    });
    return { ok: true, details: "Prisma CLI available." };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
