import fs from "fs";
import path from "path";

function backupEnv(envPath) {
  if (fs.existsSync(envPath)) {
    fs.copyFileSync(envPath, envPath + ".bak.ed");
  }
}

function parseEnv(raw) {
  const lines = raw.split(/\r?\n/);
  const result = {};
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;
    const [key, ...rest] = line.split("=");
    if (!key) continue;
    let value = rest.join("=").trim();
    value = value.replace(/^['"]|['"]$/g, "");
    value = value.replace(/[;\n\r]/g, "");
    value = value.normalize("NFKC");
    result[key] = value;
  }
  return result;
}

function stringifyEnv(obj, originalRaw) {
  const lines = originalRaw.split(/\r?\n/);
  const keys = Object.keys(obj);
  const out = [];
  for (let line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) {
      out.push(line);
      continue;
    }
    const [key] = line.split("=");
    if (keys.includes(key.trim())) {
      out.push(`${key.trim()}=${obj[key.trim()]}`);
      keys.splice(keys.indexOf(key.trim()), 1);
    } else {
      out.push(line);
    }
  }
  for (let key of keys) {
    out.push(`${key}=${obj[key]}`);
  }
  return out.join("\n");
}

export function migrateEnvToRoot(projectRoot) {
  const rootEnv = path.join(projectRoot, ".env");
  const backendEnv = path.join(projectRoot, "backend", ".env");
  const markerPath = path.join(projectRoot, "backend", "ed", "state", "envMigration.json");

  // 1. Check migration marker
  if (fs.existsSync(markerPath)) {
    try {
      const marker = JSON.parse(fs.readFileSync(markerPath, "utf-8"));
      if (marker.migrated) return false;
    } catch {}
  }

  // 2. Backup both files
  backupEnv(rootEnv);
  backupEnv(backendEnv);

  // 3. Load both as raw text
  const rootRaw = fs.existsSync(rootEnv) ? fs.readFileSync(rootEnv, "utf-8") : "";
  const backendRaw = fs.existsSync(backendEnv) ? fs.readFileSync(backendEnv, "utf-8") : "";

  // 4. Parse both
  const rootObj = parseEnv(rootRaw);
  const backendObj = parseEnv(backendRaw);

  // 5. Merge backend into root
  for (const [key, value] of Object.entries(backendObj)) {
    if (!rootObj[key] && value && value !== "placeholder") {
      rootObj[key] = value;
    }
  }

  // 6. Write merged result to root .env
  const mergedRaw = stringifyEnv(rootObj, rootRaw);
  fs.writeFileSync(rootEnv, mergedRaw);

  // 7. Delete backend/.env
  if (fs.existsSync(backendEnv)) {
    fs.unlinkSync(backendEnv);
  }

  // 8. Write migration marker
  fs.writeFileSync(markerPath, JSON.stringify({ migrated: true, timestamp: new Date().toISOString() }, null, 2));

  return true;
}
