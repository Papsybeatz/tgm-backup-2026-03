import fs from "fs";
import path from "path";

export async function scanReactTreeIntegrity(projectRoot) {
  const issues = [];

  const appFile = path.join(projectRoot, "src", "App.jsx");

  if (!fs.existsSync(appFile)) {
    issues.push({
      type: "warning",
      message: "App.jsx missing"
    });
  } else {
    issues.push({
      type: "ok",
      message: "React tree root found"
    });
  }

  return issues;
}
