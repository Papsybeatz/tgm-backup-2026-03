import fs from "fs";
const path = globalThis.ED_SAFE_PATH;

export async function scanRoutingIntegrity(projectRoot) {
  const issues = [];

  const srcDir = path.join(projectRoot, "src");

  if (!fs.existsSync(srcDir)) {
    issues.push({ type: "error", message: "src/ missing" });
    return issues;
  }

  const files = walk(srcDir).filter(f => f.endsWith(".jsx") || f.endsWith(".js"));

  const routeFiles = files.filter(f => fs.readFileSync(f, "utf8").includes("<Route"));

  if (routeFiles.length === 0) {
    issues.push({
      type: "warning",
      message: "No React Router <Route> components found"
    });
  } else {
    issues.push({
      type: "ok",
      message: "Routing structure detected"
    });
  }

  return issues;
}

function walk(dir) {
  return fs.readdirSync(dir).flatMap(entry => {
    const full = path.join(dir, entry);
    return fs.statSync(full).isDirectory() ? walk(full) : full;
  });
}
