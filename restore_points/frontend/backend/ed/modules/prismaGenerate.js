// backend/ed/modules/prismaGenerate.js
import fs from "fs";
import path from "path";
import { exec } from "child_process";

/**
 * Check if Prisma Client exists inside backend/node_modules/@prisma/client
 */
function prismaClientExists(backendRoot) {
  const clientPath = path.join(backendRoot, "node_modules", "@prisma", "client");
  try {
    return fs.existsSync(clientPath) && fs.statSync(clientPath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Run `npx prisma generate` in backendRoot
 */
function runPrismaGenerate(backendRoot) {
  return new Promise((resolve) => {
    const proc = spawn("npx", ["prisma", "generate"], {
      cwd: backendRoot,
      shell: process.platform === "win32"
    });
    let output = "";
    proc.stdout.on("data", (data) => { output += data.toString(); });
    proc.stderr.on("data", (data) => { output += data.toString(); });
    proc.on("close", (code) => {
      resolve({ code, output });
    });
  });
}

/**
 * Ensure Prisma Client is generated and ready
 * - Checks if client exists
 * - If missing, runs prisma generate
 * - Returns true if client is present after attempt
 */
export function ensurePrismaClient({ projectRoot }) {
  return new Promise((resolve, reject) => {
    const backendRoot = path.join(projectRoot, "backend");
    const prismaClientDir = path.join(backendRoot, "node_modules", "@prisma", "client");

    if (fs.existsSync(prismaClientDir)) {
      return resolve({ ok: true, details: "Prisma Client already exists." });
    }

    const cmd = "npx prisma generate";
    const options = { cwd: backendRoot };

    console.log("[ED] ensurePrismaClient: generating Prisma Client in", options.cwd);

    exec(cmd, options, (error, stdout, stderr) => {
      if (error) {
        return reject(
          new Error(`Prisma generate failed: ${stderr || error.message}`)
        );
      }
      resolve({ ok: true, details: "Prisma Client generated successfully." });
    });
  });
}
