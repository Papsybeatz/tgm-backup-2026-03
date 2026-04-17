
// backend/ed/modules/routeMount.js

import http from "http";

/**
 * Helper: perform a GET request and return status + body
 */
function httpGet(url) {
  return new Promise((resolve) => {
    http
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () =>
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            body: data,
          })
        );
      })
      .on("error", (err) => {
        resolve({ ok: false, status: 0, body: err.message });
      });
  });
}

/**
 * Check if backend mounts expected routes
 * - Tries /routes introspection endpoint if available
 * - Falls back to probing known routes
 * - Detects missing/unmounted routes, 404s, 500s, network errors
 */
export async function checkRouteMount({ host = "localhost", port = 3000, routes = ["/health", "/ai/editor"] }) {
  console.log(`[ED] checkRouteMount: probing backend at http://${host}:${port}`);
  // Try introspection endpoint first
  const introspect = await httpGet(`http://${host}:${port}/routes`);
  let mountedRoutes = [];
  if (introspect.ok && introspect.body) {
    try {
      const parsed = JSON.parse(introspect.body);
      if (Array.isArray(parsed.routes)) {
        mountedRoutes = parsed.routes;
      }
    } catch {}
  }
  // If introspection failed, probe known routes
  if (!mountedRoutes.length) {
    mountedRoutes = [];
    for (const route of routes) {
      const res = await httpGet(`http://${host}:${port}${route}`);
      if (res.ok) {
        mountedRoutes.push(route);
      } else {
        console.log(`❌ Route ${route} not mounted (status: ${res.status})`);
      }
    }
  }
  // Report results
  if (mountedRoutes.length) {
    console.log(`✅ Mounted routes: ${mountedRoutes.join(", ")}`);
    return mountedRoutes;
  } else {
    console.log("❌ No expected routes mounted.");
    return [];
  }
}
