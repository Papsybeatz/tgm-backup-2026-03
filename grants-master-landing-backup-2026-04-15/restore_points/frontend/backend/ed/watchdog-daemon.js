// backend/ed/watchdog-daemon.js

import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { runWatchdog } from "./modules/watchdog.js";

// Resolve ED root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load config
const configPath = path.join(__dirname, "config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

// Start Watchdog
debugger;
console.log("🛡️  ED-Watchdog daemon starting...");
runWatchdog(config, __dirname);
