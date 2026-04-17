import fs from "fs";
const path = globalThis.ED_SAFE_PATH;

export async function fixContractPathDrift(projectRoot) {
  const actions = [];

  const contractDir = path.join(projectRoot, "packages", "contract");
  const indexFile = path.join(contractDir, "index.js");
  const serverFile = path.join(projectRoot, "server.js");

  if (!fs.existsSync(contractDir)) {
    fs.mkdirSync(contractDir, { recursive: true });
    actions.push({ type: "create", file: contractDir });
  }

  if (!fs.existsSync(indexFile)) {
    fs.writeFileSync(
      indexFile,
      `export async function getContractMap() {
  return { contracts: [], message: "Auto-generated stub" };
}
`,
      "utf8"
    );
    actions.push({ type: "create", file: indexFile });
  }

  const indexContent = fs.readFileSync(indexFile, "utf8");
  if (!indexContent.includes("getContractMap")) {
    fs.writeFileSync(
      indexFile,
      indexContent +
        `\nexport async function getContractMap() {
  return { contracts: [], message: "Injected by ED" };
}
`,
      "utf8"
    );
    actions.push({ type: "patch", file: indexFile });
  }

  const serverContent = fs.readFileSync(serverFile, "utf8");
  const expectedImport = `import { getContractMap } from "./packages/contract/index.js";`;

  if (!serverContent.includes(expectedImport)) {
    const patched = expectedImport + "\n" + serverContent;
    fs.writeFileSync(serverFile, patched, "utf8");
    actions.push({ type: "patch", file: serverFile });
  }

  return actions.length
    ? actions
    : [{ type: "ok", message: "No fixes required" }];
}
