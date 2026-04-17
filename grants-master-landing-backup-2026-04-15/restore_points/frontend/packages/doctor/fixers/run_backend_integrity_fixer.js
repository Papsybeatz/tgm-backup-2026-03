import fixBackendIntegrity from "./backend_integrity_fixer.js";
import backendIntegrity from "../checks/backend_integrity.js";
import * as path from "node:path";

async function runFixer() {
  const projectRoot = process.cwd();
  const checkResult = await backendIntegrity({ projectRoot });
  const fixResult = await fixBackendIntegrity({ projectRoot, checkResult });
  console.log(JSON.stringify(fixResult, null, 2));
}

runFixer();
