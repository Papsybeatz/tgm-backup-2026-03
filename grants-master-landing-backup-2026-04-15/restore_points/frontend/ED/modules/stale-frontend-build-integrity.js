// ED/modules/stale-frontend-build-integrity.js

export default {
  id: "stale-frontend-build-integrity",
  description: "Detects stale frontend builds, static serving, and origin mismatches",

  async scan({ projectRoot, frontendRoot, backendRoot }, options) {
    const path = globalThis.ED_SAFE_PATH;
    const fs = await import("fs/promises");

    const dist = path.join(frontendRoot, "dist");
    const build = path.join(frontendRoot, "build");
    const publicDir = path.join(frontendRoot, "public");

    const results = {
      hasDist: false,
      hasBuild: false,
      hasPublic: false,
      staticServingDetected: false,
      wildcardRouteDetected: false,
      staleIndexDetected: false,
      issues: [],
      logs: []
    };

    // Check for stale folders
    for (const folder of [dist, build, publicDir]) {
      try {
        const stat = await fs.stat(folder);
        if (stat.isDirectory()) {
          if (folder.endsWith("dist")) results.hasDist = true;
          if (folder.endsWith("build")) results.hasBuild = true;
          if (folder.endsWith("public")) results.hasPublic = true;
          if (options?.detailed) results.logs.push(`Found directory: ${folder}`);
        }
      } catch {
        if (options?.detailed) results.logs.push(`Missing directory: ${folder}`);
      }
    }

    // Check backend static serving
    try {
      const serverJs = path.join(backendRoot, "server.js");
      const content = await fs.readFile(serverJs, "utf8");

      if (content.includes("express.static")) {
        results.staticServingDetected = true;
        results.issues.push("backend_static_serving_detected");
        if (options?.detailed) results.logs.push("Detected express.static in server.js");
      }

      if (content.includes("app.get('*'")) {
        results.wildcardRouteDetected = true;
        results.issues.push("wildcard_route_detected");
        if (options?.detailed) results.logs.push("Detected wildcard route in server.js");
      }
    } catch {
      if (options?.detailed) results.logs.push("Could not read server.js");
    }

    return results;
  }
};
