// ED/utils/moduleIntegritySentinel.js

import fs from "fs";

// Patterns to rewrite
const PATH_IMPORT_REGEX =
  /import\s+path\s+from\s+["']path["'];?/g;

const PATH_REQUIRE_REGEX =
  /const\s+path\s*=\s*require\(["']path["']\);?/g;

const PATH_DESTRUCTURE_REGEX =
  /import\s+\{\s*[^}]*\}\s+from\s+["']path["'];?/g;

// Replace direct path usage
const DIRECT_PATH_CALLS =
  /\bpath\.(join|resolve|normalize|dirname|basename)\s*\(/g;

// Replace shadowed path variables
const SHADOWED_PATH =
  /\bconst\s+path\s*=\s*[^;]+;/g;

export function applyModuleIntegritySentinel(source) {
  if (typeof source !== "string") return source;

  let out = source;

  // Replace all path imports
  out = out.replace(PATH_IMPORT_REGEX, 'const path = globalThis.ED_SAFE_PATH;');
  out = out.replace(PATH_REQUIRE_REGEX, 'const path = globalThis.ED_SAFE_PATH;');
  out = out.replace(PATH_DESTRUCTURE_REGEX, 'const path = globalThis.ED_SAFE_PATH;');

  // Replace shadowed path variables
  out = out.replace(SHADOWED_PATH, 'const path = globalThis.ED_SAFE_PATH;');

  // Replace direct path calls
  out = out.replace(DIRECT_PATH_CALLS, 'path.$1(');

  return out;
}
