
// backend/ed/modules/filesystemDrift.js

import fs from "fs";
import path from "path";

/**
 * Filesystem drift detection:
 * - Detect missing critical files
 * - Detect unexpected new files
 * - Detect missing folders
 * - Detect drift in prisma/, routes/, and server.js
 */

export async function checkFilesystemDrift(backendRoot) {
  console.log("[ED] checkFilesystemDrift: scanning backend filesystem...");

  const expectedStructure = {
    folders: ["prisma", "routes", "ed"],
    files: ["server.js"],
    prisma: ["schema.prisma"],
    routes: [], // Optionally add expected route files
    ed: [], // Optionally add expected ED files
  };

  // Check folders
  for (const folder of expectedStructure.folders) {
    const folderPath = path.join(backendRoot, folder);
    if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
      console.log(`❌ Missing folder: ${folder}`);
    }
  }

  // Check files
  for (const file of expectedStructure.files) {
    const filePath = path.join(backendRoot, file);
    if (!fs.existsSync(filePath)) {
      console.log(`❌ Missing file: ${file}`);
    }
  }

  // Check prisma folder
  const prismaPath = path.join(backendRoot, "prisma");
  if (fs.existsSync(prismaPath)) {
    for (const file of expectedStructure.prisma) {
      const filePath = path.join(prismaPath, file);
      if (!fs.existsSync(filePath)) {
        console.log(`❌ Missing Prisma file: ${file}`);
      }
    }
    // Detect unexpected files in prisma/
    const prismaFiles = fs.readdirSync(prismaPath);
    for (const file of prismaFiles) {
      if (!expectedStructure.prisma.includes(file)) {
        console.log(`⚠️ Unexpected file in prisma/: ${file}`);
      }
    }
  }

  // Check routes folder
  const routesPath = path.join(backendRoot, "routes");
  if (fs.existsSync(routesPath)) {
    const routeFiles = fs.readdirSync(routesPath);
    for (const file of routeFiles) {
      if (!expectedStructure.routes.includes(file)) {
        console.log(`⚠️ Unexpected file in routes/: ${file}`);
      }
    }
  }

  // Check ed folder
  const edPath = path.join(backendRoot, "ed");
  if (fs.existsSync(edPath)) {
    const edFiles = fs.readdirSync(edPath);
    for (const file of edFiles) {
      if (!expectedStructure.ed.includes(file)) {
        console.log(`⚠️ Unexpected file in ed/: ${file}`);
      }
    }
  }

  console.log("[ED] checkFilesystemDrift: scan complete.");
  return true;
}
