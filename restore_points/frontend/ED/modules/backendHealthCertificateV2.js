// ed/modules/backendHealthCertificateV2.js
import http from "http";
import { PrismaClient } from "@prisma/client";

const TAG = "[backendBoot][HealthV2]";
function log(...args) { console.log(TAG, ...args); }

export async function runBackendHealthV2(options) {
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
    checks: {},
  };
  const start = Date.now();

  try {
    // 1) Port/host validation
    result.checks.port = expectedPort;
    result.checks.host = expectedHost;

    // 2) /health endpoint
    result.checks.healthEndpoint = await pingEndpoint({ host: expectedHost, port: expectedPort, path: "/health" }).catch(() => false);
    if (!result.checks.healthEndpoint) {
      result.status = "failed";
      result.errors.push("healthEndpointUnreachable");
      result.issues.push(`Backend /health endpoint not responding on http://${expectedHost}:${expectedPort}`);
    }

    // 3) /api/grants endpoint
    result.checks.apiGrants = await pingEndpoint({ host: expectedHost, port: expectedPort, path: "/api/grants" }).catch(() => false);
    if (!result.checks.apiGrants) {
      result.status = "failed";
      result.errors.push("apiGrantsUnreachable");
      result.issues.push(`Backend /api/grants endpoint not responding on http://${expectedHost}:${expectedPort}`);
    }

    // 4) CORS validation
    for (const origin of expectedOrigins) {
      const corsOk = await checkCorsPreflight({ host: expectedHost, port: expectedPort, path: "/api/drafts/save", origin }).catch(() => false);
      result.checks[`cors_${origin}`] = corsOk;
      if (!corsOk) {
        result.status = "failed";
        result.errors.push("corsMisconfigured");
        result.issues.push(`CORS preflight failed for origin ${origin} on /api/drafts/save`);
      }
    }

    // 5) Database connectivity
    let prismaOk = false;
    try {
      const prisma = new PrismaClient();
      await prisma.$connect();
      prismaOk = true;
      await prisma.$disconnect();
    } catch (err) {
      result.status = "failed";
      result.errors.push("prismaConnectFailed");
      result.issues.push("Prisma database connection failed.");
    }
    result.checks.prisma = prismaOk;

    // 6) Environment validation
    result.checks.env = process.env.NODE_ENV || "unknown";
    if (!process.env.NODE_ENV) {
      result.status = "failed";
      result.errors.push("envMissing");
      result.issues.push("NODE_ENV not set.");
    }

    result.timeMs = Date.now() - start;
    printCertificate(result);
    return result;
  } catch (err) {
    log("Unexpected error during HealthV2 check:", err);
    result.status = "failed";
    result.errors.push("unexpectedHealthV2Error");
    result.timeMs = Date.now() - start;
    printCertificate(result);
    return result;
  }
}

function pingEndpoint({ host, port, path }) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host, port, path, method: "GET", timeout: 2000 }, (res) => {
      const ok = res.statusCode && res.statusCode < 500;
      res.resume();
      ok ? resolve(true) : resolve(false);
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
    req.end();
  });
}

function checkCorsPreflight({ host, port, path, origin }) {
  return new Promise((resolve, reject) => {
    const req = http.request({
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
    }, (res) => {
      const allowOrigin = res.headers["access-control-allow-origin"];
      const allowMethods = res.headers["access-control-allow-methods"];
      const allowHeaders = res.headers["access-control-allow-headers"];
      const originOk = allowOrigin === "*" || allowOrigin === origin || Array.isArray(allowOrigin) && allowOrigin.includes(origin);
      const methodsOk = typeof allowMethods === "string" && allowMethods.toUpperCase().includes("POST");
      const headersOk = typeof allowHeaders === "string" && allowHeaders.toLowerCase().includes("content-type");
      res.resume();
      if (originOk && methodsOk && headersOk) { resolve(true); } else { resolve(false); }
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
    req.end();
  });
}

function printCertificate(result) {
  const { status, issues, errors, timeMs, checks } = result;
  console.log("--------------------------------------------------");
  if (status === "healthy") {
    console.log("🟢 Backend HealthV2: ALL CHECKS PASSED");
  } else {
    console.log("🔴 Backend HealthV2: FAILED");
  }
  if (issues.length) {
    console.log("Issues:"); issues.forEach((i) => console.log(" -", i));
  }
  if (errors.length) {
    console.log("Errors:"); errors.forEach((e) => console.log(" -", e));
  }
  console.log("Checks:", checks);
  console.log(`⏱️  Check runtime: ${timeMs} ms`);
  console.log("--------------------------------------------------");
}
