import fs from "fs";
import path from "path";

export function ensurePrismaCLI(projectRoot) {
  const prismaPath = path.join(projectRoot, "node_modules", "prisma");

  if (fs.existsSync(prismaPath)) {
    console.log("🧩 ED: Prisma CLI already installed.");
    return true;
  }

  console.log("🛠️ ED: Prisma CLI missing. Installing prisma --save-dev...");
  const result = spawnSync("npm", ["install", "prisma", "--save-dev"], {
    cwd: projectRoot,
    stdio: "inherit",
    shell: true
  });

  return result.status === 0;
}

// prismaCliIntegrity.js
export function prismaCliIntegrity({ projectRoot }) {
  const backendRoot = path.join(projectRoot, "backend");

  const prismaBin = path.join(
    backendRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "prisma.cmd" : "prisma"
  );

  if (fs.existsSync(prismaBin)) {
    return { ok: true, details: "Prisma CLI available." };
  }

  return { ok: false, error: "Prisma CLI not available." };
}
