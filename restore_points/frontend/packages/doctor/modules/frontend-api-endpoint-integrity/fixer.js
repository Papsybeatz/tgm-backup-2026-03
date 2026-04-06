import fs from "fs";
const path = globalThis.ED_SAFE_PATH;

export async function fixFrontendApiEndpoints(projectRoot) {
  const actions = [];

  const srcDir = path.join(projectRoot, "src");
  if (!fs.existsSync(srcDir)) {
    return [
      {
        type: "error",
        message: "src/ folder missing — cannot fix API endpoints"
      }
    ];
  }

  const files = walk(srcDir).filter(f => f.endsWith(".js") || f.endsWith(".jsx"));

  for (const file of files) {
    let content = fs.readFileSync(file, "utf8");
    let original = content;

    // Fix missing leading slash
    content = content.replace(/fetch\(["'`]api\//g, `fetch("/api/`);

    // Fix relative paths (e.g., "./api", "../api")
    content = content.replace(/fetch\(["'`]\.\/api\//g, `fetch("/api/`);
    content = content.replace(/fetch\(["'`]\.\.\/api\//g, `fetch("/api/`);

    if (content !== original) {
      fs.writeFileSync(file, content, "utf8");
      actions.push({
        type: "patch",
        file,
        message: "Normalized API endpoint paths"
      });
    }
  }

  return actions.length
    ? actions
    : [{ type: "ok", message: "No API endpoint fixes required" }];
}

function walk(dir) {
  return fs.readdirSync(dir).flatMap(entry => {
    const full = path.join(dir, entry);
    return fs.statSync(full).isDirectory() ? walk(full) : full;
  });
}
