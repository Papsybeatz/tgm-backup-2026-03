import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const GHOST_PATTERNS = [
  "🧩 prisma-engine-integrity",
  "prisma-engine-integrity",
  "Prisma CLI not available."
];

const thisFile = fileURLToPath(import.meta.url).replace(/\\/g, "/");

const SAFE_SCAN_FOLDERS = [
  "/backend/routes/",
  "/backend/prisma/",
  "/backend/utils/"
];

export function ghostModuleSweep({ projectRoot }) {
  const hits = [];
  const quarantineDir = path.join(
    projectRoot,
    "backend",
    "ed",
    "quarantine",
    Date.now().toString()
  );

  function shouldScan(fullPath) {
    const normalized = fullPath.replace(/\\/g, "/");

    // Never scan ED itself
    if (normalized.includes("/backend/ed/")) return false;
    if (normalized.includes("/ED/")) return false;

    // Never scan system folders
    if (normalized.includes("/node_modules/")) return false;
    if (normalized.includes("/dist/")) return false;
    if (normalized.includes("/build/")) return false;
    if (normalized.includes("/.")) return false;

    // Never scan the file currently executing
    if (normalized === thisFile) return false;

    // Only scan safe folders
    return SAFE_SCAN_FOLDERS.some(folder => normalized.includes(folder));
  }

  function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const normalized = fullPath.replace(/\\/g, "/");

      if (!shouldScan(normalized)) continue;

      if (entry.isDirectory()) {
        scan(fullPath);
        continue;
      }

      if (!entry.name.match(/\.(js|mjs|cjs|ts|map)$/)) continue;

      const content = fs.readFileSync(fullPath, "utf8");

      for (const pattern of GHOST_PATTERNS) {
        if (content.includes(pattern)) {
          hits.push({ file: fullPath, pattern });

          fs.mkdirSync(quarantineDir, { recursive: true });
          const dest = path.join(quarantineDir, entry.name);
          fs.copyFileSync(fullPath, dest);
          fs.unlinkSync(fullPath);
        }
      }
    }
  }

  scan(projectRoot);

  if (hits.length === 0) {
    return { ok: true, details: "No ghost modules detected." };
  }

  return {
    ok: false,
    error: "Ghost modules detected and quarantined.",
    hits,
    quarantineDir
  };
}
