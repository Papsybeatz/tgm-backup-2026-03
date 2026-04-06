import fs from "fs";
import path from "path";

const distDir = path.resolve("dist");

function fail(msg) {
  console.error("[FrontendGuardian][build] ❌", msg);
  process.exit(1);
}

function main() {
  if (!fs.existsSync(distDir)) {
    fail(`dist directory not found at ${distDir}`);
  }

  const files = fs.readdirSync(distDir);
  if (!files.some((f) => f.endsWith(".html"))) {
    fail("No HTML entry file found in dist.");
  }

  if (!files.some((f) => f.includes("assets"))) {
    console.warn(
      "[FrontendGuardian][build] ⚠️ No assets directory detected. Check build config."
    );
  }

  console.log("[FrontendGuardian][build] ✅ Build integrity basic checks passed.");
}

main();
