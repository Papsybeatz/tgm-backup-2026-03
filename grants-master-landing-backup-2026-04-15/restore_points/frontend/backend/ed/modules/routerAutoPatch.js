// routerAutoPatch.js
// Automatically converts CommonJS router files to ESM-safe syntax.

import fs from "fs";
import path from "path";

export async function autoPatchRouterFile(fullPath) {
  let code = fs.readFileSync(fullPath, "utf8");
  let original = code;

  // Convert require() → import
  code = code.replace(
    /const\s+(\w+)\s*=\s*require\(['"](.+?)['"]\);?/g,
    `import $1 from "$2";`
  );

  // Convert module.exports → export default
  code = code.replace(
    /module\.exports\s*=\s*(\w+);?/g,
    `export default $1;`
  );

  // Detect ANY existing ESM header patterns
  const hasESMHeader =
    code.includes("fileURLToPath(import.meta.url)") ||
    code.includes("const __filename") ||
    code.includes("const __dirname") ||
    code.includes("from \"url\"") ||
    code.includes("from 'url'");

  // Add ESM header only if missing
  if (!hasESMHeader) {
    const esmHeader = `\nimport { fileURLToPath } from "url";\nimport path from "path";\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = path.dirname(__filename);\n`;
    code = esmHeader + code;
  }

  // Ensure express import
  if (!/from\s+["']express["']/.test(code)) {
    code = `import express from "express";\n` + code;
  }

  // Ensure router exists
  if (!/const\s+router\s*=/.test(code)) {
    code = `const router = express.Router();\n` + code;
  }

  // Ensure export default router
  if (!/export\s+default\s+router/.test(code)) {
    code += `\nexport default router;\n`;
  }

  if (code !== original) {
    fs.writeFileSync(fullPath, code, "utf8");
    return { patched: true, file: fullPath };
  }

  return { patched: false, file: fullPath };
}
