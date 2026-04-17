import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

export async function fixPrismaClientIntegrity(projectRoot) {
  const backendNodeModules = path.join(projectRoot, "backend", "node_modules");
  const rootNodeModules = path.join(projectRoot, "node_modules");
  const prismaConfigPath = path.join(projectRoot, "prisma.config.js");

  // 1. Remove backend/node_modules if it exists
  if (fs.existsSync(backendNodeModules)) {
    console.log("🛠️ ED: Removing invalid backend/node_modules...");
    fs.rmSync(backendNodeModules, { recursive: true, force: true });
  }

  // 2. Patch prisma.config.js with correct client output
  let config = fs.readFileSync(prismaConfigPath, "utf-8");
  if (!config.includes('output: "./node_modules/@prisma/client"')) {
    console.log("🛠️ ED: Patching prisma.config.js with correct client output...");
    config = config.replace(
      /defineConfig\(\{/, 
      `defineConfig({\n  generator: {\n    client: {\n      output: \"./node_modules/@prisma/client\"\n    }\n  },`
    );
    fs.writeFileSync(prismaConfigPath, config);
  }

  // 3. Reinstall dependencies
  console.log("🛠️ ED: Reinstalling dependencies...");
  fs.rmSync(rootNodeModules, { recursive: true, force: true });
  spawnSync("npm", ["install"], { cwd: projectRoot, stdio: "inherit", shell: true });

  // 4. Regenerate Prisma Client
  console.log("🛠️ ED: Regenerating Prisma Client...");
  const result = spawnSync("npx", ["prisma", "generate"], {
    cwd: projectRoot,
    stdio: "inherit",
    shell: true
  });

  return result.status === 0;
}
