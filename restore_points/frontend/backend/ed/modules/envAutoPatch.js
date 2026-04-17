// envAutoPatch.js
import fs from "fs";
import path from "path";

export function ensureEnvKeys({ projectRoot, requiredKeys }) {
  const envPath = path.join(projectRoot, ".env");

  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, "");
  }

  let env = fs.readFileSync(envPath, "utf8");
  let patched = false;

  for (const key of requiredKeys) {
    if (!env.includes(`${key}=`)) {
      env += `\n${key}=\n`;
      patched = true;
    }
  }

  if (patched) {
    fs.writeFileSync(envPath, env);
  }

  return { ok: !patched, patched };
}
