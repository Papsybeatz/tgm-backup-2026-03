// backend/ed/mode.auto.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendRoot = path.resolve(__dirname, "..");
const configPath = path.join(backendRoot, "ed", "state", "config.json");

const config = { mode: "auto" };
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

console.log("ED mode switched to AUTO");
