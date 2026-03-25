import fs from "fs";
import path from "path";

function normalizeKey(val) {
  if (typeof val !== "string") return "";
  let key = val.trim();
  key = key.replace(/^['"]|['"]$/g, ""); // Remove surrounding quotes
  key = key.replace(/[;\n\r]/g, ""); // Remove semicolons/newlines
  key = key.normalize("NFKC"); // Unicode normalization
  return key;
}

function validateKey(name, value, pattern) {
  if (!value) return `${name} is missing or empty.`;
  if (pattern.hex) {
    if (!/^[a-fA-F0-9]{32}$/.test(value)) return `${name} must be 32 hex chars.`;
    return null;
  }
  if (pattern.prefix && !value.startsWith(pattern.prefix)) return `${name} must start with ${pattern.prefix}.`;
  if (pattern.min && value.length < pattern.min) return `${name} is too short (min ${pattern.min}).`;
  if (pattern.max && value.length > pattern.max) return `${name} is too long (max ${pattern.max}).`;
  if (/\s/.test(value)) return `${name} contains whitespace.`;
  return null;
}

export function checkEnvIntegrity(projectRoot) {
  const configPath = path.join(projectRoot, "backend", "ed", "requiredEnv.json");
  if (!fs.existsSync(configPath)) {
    console.error("⛔ ED: requiredEnv.json missing. Cannot verify environment integrity.");
    return false;
  }
  const { required } = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const patterns = required;
  let allValid = true;
  for (const [name, pattern] of Object.entries(patterns)) {
    let raw = process.env[name];
    let key = normalizeKey(raw);
    const error = validateKey(name, key, pattern);
    if (error) {
      console.error(`⛔ ED: ${error}`);
      allValid = false;
    }
  }
  return allValid;
}
