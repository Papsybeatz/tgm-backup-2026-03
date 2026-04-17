import fs from "fs";
import path from "path";

const GHOST_PATTERNS = [
  "🧩",
  "prisma-engine",
  "engine-integrity",
  "Issues detected",
  "⛔",
  "❌",
  "prismaEngineIntegrity"
];

export function ghostModuleSweep({ projectRoot }) {
  const hits = [];
  const quarantineDir = path.join(projectRoot, "backend", "ed", "quarantine", Date.now().toString());

  function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        scan(fullPath);
        continue;
      }

      if (!entry.name.match(/\.(js|mjs|cjs|ts|map)$/)) continue;

      const content = fs.readFileSync(fullPath, "utf8");

      for (const pattern of GHOST_PATTERNS) {
        if (content.includes(pattern)) {
          hits.push({ file: fullPath, pattern });

          // --- Quarantine mode ---
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
