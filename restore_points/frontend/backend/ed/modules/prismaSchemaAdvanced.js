// ED Advanced Prisma Schema Validation
import fs from "fs";
import { edLog } from "../logger.js";
import { fileURLToPath } from "url";
import path from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load ED config for schema path
const configPath = path.resolve(__dirname, "../config.json");
let edConfig = {};
if (fs.existsSync(configPath)) {
  edConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
}
const schemaPath = path.resolve(process.cwd(), edConfig.prismaSchemaPath || "../../prisma/schema.prisma");
console.log("Resolved schema path from config:", schemaPath);
if (!fs.existsSync(schemaPath)) {
  edLog("Prisma schema.prisma not found at config path.");
  return;
}
const schema = fs.readFileSync(schemaPath, "utf8");

// Check for duplicate model names
const modelNames = [...schema.matchAll(/model\s+(\w+)/g)].map(m => m[1]);
const duplicates = modelNames.filter((item, idx) => modelNames.indexOf(item) !== idx);
if (duplicates.length > 0) {
  edLog(`Duplicate model(s) found: ${duplicates.join(", ")}`);
  // Optionally, auto-remove duplicates here
}

// Check for missing relation fields
if (schema.includes("model Client") && !schema.includes("clients   Client[]")) {
  edLog("Missing relation field: User.clients for Client.agency");
  // Optionally, auto-insert relation field here
}

// Check for invalid field definitions
const invalidField = schema.match(/model\s+\w+\s+{[^}]*[^\s]+\s+@invalid[^}]*}/);
if (invalidField) {
  edLog("Invalid field definition detected.");
  // Optionally, auto-fix or remove invalid field
}

// Check for schema drift (unmatched braces)
const openBraces = (schema.match(/{/g) || []).length;
const closeBraces = (schema.match(/}/g) || []).length;
if (openBraces !== closeBraces) {
  edLog("Schema drift detected: unmatched braces.");
  // Optionally, auto-fix by adding missing braces
}

edLog("Advanced Prisma schema validation completed.");
