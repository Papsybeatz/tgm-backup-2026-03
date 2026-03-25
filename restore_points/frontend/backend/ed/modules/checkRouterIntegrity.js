// checkRouterIntegrity.js
// Ensures backend routes are loadable, valid, and not throwing on import.

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { autoPatchRouterFile } from "./routerAutoPatch.js";

export async function checkRouterIntegrity({ projectRoot }) {
  const routesDir = path.join(projectRoot, "backend", "routes");

  if (!fs.existsSync(routesDir)) {
    return { ok: false, error: "Routes directory missing", patches: [] };
  }

  const files = fs.readdirSync(routesDir).filter(f => f.endsWith(".js"));
  const patches = [];

  for (const file of files) {
    const fullPath = path.join(routesDir, file);

    const patchResult = await autoPatchRouterFile(fullPath);
    if (patchResult.patched) patches.push(patchResult.file);

    const fileUrl = pathToFileURL(fullPath).href;

    try {
      await import(fileUrl);
    } catch (err) {
      return {
        ok: false,
        error: `Router file ${file} failed to load: ${err.message}`,
        patches
      };
    }
  }

  return { ok: true, details: "All router files loaded successfully.", patches };
}
