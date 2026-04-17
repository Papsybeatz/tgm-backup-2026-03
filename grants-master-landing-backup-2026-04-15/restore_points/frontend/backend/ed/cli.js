// backend/ed/cli.js

import { spawn } from "child_process";
import { runBootIntegrity } from "./bootIntegrity.js";
import { runSystemCheck } from "./systemCheck.js";
import { edSweep } from "./edSweep.js";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "../..");
process.chdir(backendRoot);

async function startBackend() {
	console.log("ED: Starting backend server...");
	try {
		await import(new URL("../server.js", import.meta.url));
	} catch (err) {
		console.error("Server import failed:", err);
	}
}

// CLI argument parsing for sweep
const args = process.argv.slice(2);
if (args.includes("sweep") || args.includes("--sweep")) {
	console.log("ED: Running full integrity sweep...");
	await edSweep("manual");
	process.exit(0);
}

console.log("ED: Running ED-SystemCheck...");
const systemCheckOk = runSystemCheck();
if (!systemCheckOk) {
	console.log("ED-SystemCheck failed. See ed/state/systemCheck.log for details.");
	process.exit(1);
}

const ok = runBootIntegrity();
if (ok) startBackend();
else console.log("ED: Boot integrity failed — backend not started.");
