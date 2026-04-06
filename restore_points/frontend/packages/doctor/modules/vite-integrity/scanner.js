import fs from "fs";
import path from "path";

export async function scanViteIntegrity(projectRoot) {
  const issues = [];

  const viteConfig = path.join(projectRoot, "vite.config.js");

  if (!fs.existsSync(viteConfig)) {
    issues.push({
      type: "warning",
      message: "vite.config.js missing"
    });
  } else {
    issues.push({
      type: "ok",
      message: "Vite config present"
    });
  }

  return issues;
}
