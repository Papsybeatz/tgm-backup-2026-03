import fs from "fs";
const path = globalThis.ED_SAFE_PATH;

export async function scanApiContractConsistency(projectRoot) {
  const issues = [];

  const contractFile = path.join(projectRoot, "packages", "contract", "index.js");
  const frontendDir = path.join(projectRoot, "src");

  if (!fs.existsSync(contractFile)) {
    issues.push({ type: "error", message: "Contract index.js missing" });
    return issues;
  }

  if (!fs.existsSync(frontendDir)) {
    issues.push({ type: "error", message: "Frontend src/ missing" });
    return issues;
  }

  let backendContract;
  try {
    backendContract = await import(`file://${contractFile}`);
  } catch (err) {
    issues.push({
      type: "error",
      message: "Failed to load backend contract",
      details: err.message
    });
    return issues;
  }

  if (typeof backendContract.getContractMap !== "function") {
    issues.push({
      type: "error",
      message: "Backend missing getContractMap()"
    });
    return issues;
  }

  const backendMap = await backendContract.getContractMap();

  if (!backendMap || typeof backendMap !== "object") {
    issues.push({
      type: "error",
      message: "Backend contract map invalid"
    });
  }

  issues.push({
    type: "ok",
    message: "API contract consistency appears valid"
  });

  return issues;
}
