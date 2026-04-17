import fs from "fs";
import path from "path";

export function frontendDiagnostics() {
  const issues = [];

  // 1. Required env vars
  const requiredEnv = [
    "VITE_API_URL",
    "VITE_STRIPE_PUBLIC_KEY"
  ];

  requiredEnv.forEach(key => {
    if (!process.env[key] || process.env[key].trim() === "") {
      issues.push(`Missing or empty env var: ${key}`);
    }
  });

  // 2. Check generated files
  const generatedDir = path.resolve("src/generated");
  if (!fs.existsSync(generatedDir)) {
    issues.push("Missing src/generated directory");
  }

  // 3. Check Vite config
  const viteConfig = path.resolve("vite.config.js");
  if (!fs.existsSync(viteConfig)) {
    issues.push("Missing vite.config.js");
  }

  return { issues };
}
