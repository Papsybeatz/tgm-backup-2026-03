
// backend/ed/modules/routerIntegrity.js

import fs from "fs";
import path from "path";

/**
 * Static Express router integrity check:
 * - Detect missing route files
 * - Detect missing router exports
 * - Detect invalid Express router syntax
 * - Detect missing app.use() mounts
 * - Detect empty routers
 * - Detect malformed route handlers
 */

export async function checkRouterIntegrity(backendRoot) {
  console.log("[ED] checkRouterIntegrity: scanning Express routers...");
  const routesPath = path.join(backendRoot, "routes");
  if (!fs.existsSync(routesPath) || !fs.statSync(routesPath).isDirectory()) {
    console.log("❌ Missing routes folder.");
    return false;
  }
  const routeFiles = fs.readdirSync(routesPath).filter(f => f.endsWith(".js"));
  if (!routeFiles.length) {
    console.log("❌ No route files found in routes/");
    return false;
  }
  let allOk = true;
  for (const file of routeFiles) {
    const filePath = path.join(routesPath, file);
    let content = "";
    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch (err) {
      console.log(`❌ Failed to read route file: ${file}`);
      allOk = false;
      continue;
    }
    // Check for Express router export
    if (!/module\.exports\s*=\s*router|export\s+default\s+router/.test(content)) {
      console.log(`❌ Missing router export in ${file}`);
      allOk = false;
    }
    // Check for Express router creation
    if (!/express\.Router\s*\(/.test(content)) {
      console.log(`❌ Invalid Express router syntax in ${file}`);
      allOk = false;
    }
    // Check for app.use() mount (static analysis)
    if (!/app\.use\s*\(/.test(content)) {
      console.log(`⚠️ No app.use() mount detected in ${file}`);
    }
    // Check for route handlers
    if (!/router\.(get|post|put|delete|patch)\s*\(/.test(content)) {
      console.log(`❌ No route handlers found in ${file}`);
      allOk = false;
    }
    // Check for empty router
    if (/express\.Router\s*\(\s*\)/.test(content) && !/router\.(get|post|put|delete|patch)\s*\(/.test(content)) {
      console.log(`❌ Empty router in ${file}`);
      allOk = false;
    }
    // Check for malformed handlers
    if (/router\.(get|post|put|delete|patch)\s*\(\s*['"][^'"]+['"]\s*,\s*\)/.test(content)) {
      console.log(`❌ Malformed route handler in ${file}`);
      allOk = false;
    }
  }
  if (allOk) {
    console.log("✅ All Express routers passed integrity checks.");
    return true;
  } else {
    console.log("❌ Express router integrity issues detected.");
    return false;
  }
}
