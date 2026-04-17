import fs from "fs";
const path = globalThis.ED_SAFE_PATH;

export async function scanContractPathDrift(projectRoot) {
  const issues = [];

  const contractDir = path.join(projectRoot, "packages", "contract");
  const indexFile = path.join(contractDir, "index.js");
  const serverFile = path.join(projectRoot, "server.js");

  if (!fs.existsSync(contractDir)) {
    issues.push({ type: "error", message: "Contract package folder missing" });
    return issues;
  }

  if (!fs.existsSync(indexFile)) {
    issues.push({ type: "error", message: "Contract index.js missing" });
    return issues;
  }

  const indexContent = fs.readFileSync(indexFile, "utf8");
  if (!indexContent.includes("getContractMap")) {
    issues.push({ type: "warning", message: "Missing getContractMap export" });
  }

  const serverContent = fs.readFileSync(serverFile, "utf8");
  const expectedImport = `from "./packages/contract/index.js";`;

  if (!serverContent.includes(expectedImport)) {
    issues.push({
      type: "warning",
      message: "Incorrect import path in server.js"
    });
  }

  try {
    await import(`file://${indexFile}`);
  } catch (err) {
    issues.push({
      type: "error",
      message: "Module failed to load",
      details: err.message
    });
  }

  if (issues.length === 0) {
    issues.push({ type: "ok", message: "Contract module path is valid" });
  }

  return issues;
}
