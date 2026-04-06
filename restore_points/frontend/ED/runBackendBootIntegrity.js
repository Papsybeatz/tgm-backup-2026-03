import backendBootIntegrity from "./modules/backendBootIntegrity.js";
import path from "path";
import fs from "fs";

async function main() {
  // Read latest backend boot logs
  const logPath = path.join(process.cwd(), "backend", "boot.log");
  let logs = "";
  if (fs.existsSync(logPath)) {
    logs = fs.readFileSync(logPath, "utf8");
  } else {
    // Fallback: try to read error output from last failed node server.js
    logs = "";
  }

  // Scan for issues
  const issues = await backendBootIntegrity.scan(logs);
  if (issues.length === 0) {
    console.log("No backend boot issues detected.");
    return;
  }

  console.log("Detected issues:", issues);

  // Fix issues
  await backendBootIntegrity.fix(issues, process.cwd());
  console.log("Backend boot integrity fixes applied.");
}

main();
