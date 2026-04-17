import checkBackendIntegrity from "./backend_integrity.js";
import * as path from "node:path";

async function run() {
  const projectRoot = process.cwd();
  const result = await checkBackendIntegrity({ projectRoot });
  console.log(JSON.stringify(result, null, 2));
}

run();
