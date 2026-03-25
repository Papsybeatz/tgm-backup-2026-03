import fs from "fs";
import path from "path";

export async function scanBackendIntegrity(projectRoot) {
  const issues = [];

  const serverFile = path.join(projectRoot, "server.js");

  if (!fs.existsSync(serverFile)) {
    issues.push({
      type: "error",
      message: "server.js missing"
    });
    return issues;
  }

  const content = fs.readFileSync(serverFile, "utf8");

  if (!content.includes("app.listen")) {
    issues.push({
      type: "error",
      message: "server.js missing app.listen()"
    });
  }

  if (!content.includes("import")) {
    issues.push({
      type: "warning",
      message: "server.js has no imports — unusual structure"
    });
  }

  if (issues.length === 0) {
    issues.push({
      type: "ok",
      message: "Backend integrity is valid"
    });
  }

  return issues;
}
