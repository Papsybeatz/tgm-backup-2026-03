// ed/modules/backendCorsAndAvailability.js
import http from "http";
import url from "url";

const TAG = "[backendBoot][CORS+Availability]";

function log(...args) {
  console.log(TAG, ...args);
}

export async function checkBackendCorsAndAvailability(options) {
  const {
    expectedPort = 4000,
    expectedHost = "127.0.0.1",
    expectedOrigins = ["http://127.0.0.1:5173", "http://localhost:5173"],
  } = options || {};

  const result = {
    status: "healthy",
    issues: [],
    errors: [],
    timeMs: 0,
  };

  const start = Date.now();

  try {
    // 1) Basic availability check: /health (or /)
    const healthOk = await pingEndpoint({
      host: expectedHost,
      port: expectedPort,
      path: "/health",
    }).catch(() => false);

    if (!healthOk) {
      result.status = "failed";
      result.errors.push("backendUnreachable");
      result.issues.push(
        `Backend not responding on http://${expectedHost}:${expectedPort}/health`
      );
      result.timeMs = Date.now() - start;
      printCertificate(result);
      return result;
    }

    // 2) Simple API availability check: /api/grants (or any core route)
    const apiOk = await pingEndpoint({
      host: expectedHost,
      port: expectedPort,
      path: "/api/grants",
    }).catch(() => false);

    if (!apiOk) {
      result.status = "warning";
      result.issues.push(
        `Core API route /api/grants not responding on http://${expectedHost}:${expectedPort}`
      );
    }

    // 3) CORS preflight check for each expected origin
    for (const origin of expectedOrigins) {
      const corsOk = await checkCorsPreflight({
        host: expectedHost,
        port: expectedPort,
        path: "/api/drafts/save",
        origin,
      }).catch(() => false);

      if (!corsOk) {
        result.status = "failed";
        result.errors.push("corsMisconfigured");
        result.issues.push(
          `CORS preflight failed for origin ${origin} on /api/drafts/save`
        );
      }
    }

    if (result.status === "healthy" && result.issues.length > 0) {
      result.status = "warning";
    }

    result.timeMs = Date.now() - start;
    printCertificate(result);
    return result;
  } catch (err) {
    log("Unexpected error during CORS+availability check:", err);
    result.status = "failed";
    result.errors.push("unexpectedCorsAvailabilityError");
    result.timeMs = Date.now() - start;
    printCertificate(result);
    return result;
  }
}

function pingEndpoint({ host, port, path }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host, port, path, method: "GET", timeout: 2000 },
      (res) => {
        const ok = res.statusCode && res.statusCode < 500;
        res.resume();
        ok ? resolve(true) : resolve(false);
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });

    req.end();
  });
}

function checkCorsPreflight({ host, port, path, origin }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host,
        port,
        path,
        method: "OPTIONS",
        timeout: 3000,
        headers: {
          Origin: origin,
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "Content-Type",
        },
      },
      (res) => {
        const allowOrigin = res.headers["access-control-allow-origin"];
        const allowMethods = res.headers["access-control-allow-methods"];
        const allowHeaders = res.headers["access-control-allow-headers"];

        const originOk =
          allowOrigin === "*" || allowOrigin === origin || Array.isArray(allowOrigin) && allowOrigin.includes(origin);

        const methodsOk =
          typeof allowMethods === "string" &&
          allowMethods.toUpperCase().includes("POST");

        const headersOk =
          typeof allowHeaders === "string" &&
          allowHeaders.toLowerCase().includes("content-type");

        res.resume();

        if (originOk && methodsOk && headersOk) {
          resolve(true);
        } else {
          resolve(false);
        }
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });

    req.end();
  });
}

function printCertificate(result) {
  const { status, issues, errors, timeMs } = result;

  console.log("--------------------------------------------------");
  if (status === "healthy") {
    console.log("🟢 Backend CORS + Availability: PASSED");
  } else if (status === "warning") {
    console.log("🟡 Backend CORS + Availability: WARNINGS");
  } else {
    console.log("🔴 Backend CORS + Availability: FAILED");
  }

  if (issues.length) {
    console.log("Issues:");
    issues.forEach((i) => console.log(" -", i));
  }

  if (errors.length) {
    console.log("Errors:");
    errors.forEach((e) => console.log(" -", e));
  }

  console.log(`⏱️  Check runtime: ${timeMs} ms`);
  console.log("--------------------------------------------------");
}
