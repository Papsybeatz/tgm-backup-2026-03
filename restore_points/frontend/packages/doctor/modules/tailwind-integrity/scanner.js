import fs from "fs";
const path = globalThis.ED_SAFE_PATH;

export async function scanTailwindIntegrity(projectRoot) {
  const issues = [];

  const config = path.join(projectRoot, "tailwind.config.js");

  if (!fs.existsSync(config)) {
    issues.push({
      type: "warning",
      message: "tailwind.config.js missing"
    });
  } else {
    issues.push({
      type: "ok",
      message: "Tailwind config present"
    });
  }

  return issues;
}
