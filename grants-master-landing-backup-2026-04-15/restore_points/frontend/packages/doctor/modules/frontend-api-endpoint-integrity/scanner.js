import fs from "fs";
const path = globalThis.ED_SAFE_PATH;

export async function scanFrontendApiEndpoints(projectRoot) {
  const issues = [];

  const srcDir = path.join(projectRoot, "src");

  if (!fs.existsSync(srcDir)) {
    issues.push({
      type: "error",
      message: "Frontend src/ folder missing"
    });
    return issues;
  }

  const files = walk(srcDir).filter(f => f.endsWith(".js") || f.endsWith(".jsx"));

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");

    // Detect relative API paths
    const relativeApi = content.match(/fetch\(["'`](\/api\/[^"'`]+)/g);
    if (relativeApi) {
      issues.push({
        type: "warning",
        file,
        message: "Relative API path detected",
        details: relativeApi
      });
    }

    // Detect missing base URL
    const missingBase = content.match(/fetch\(["'`](api\/[^"'`]+)/g);
    if (missingBase) {
      issues.push({
        type: "warning",
        file,
        message: "API path missing leading slash",
        details: missingBase
      });
    }
  }

  if (issues.length === 0) {
    issues.push({
      type: "ok",
      message: "Frontend API endpoints are valid"
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
