import fs from "fs";
const path = globalThis.ED_SAFE_PATH;

export async function fixBackendIntegrity(projectRoot) {
  const actions = [];

  const serverFile = path.join(projectRoot, "server.js");

  if (!fs.existsSync(serverFile)) {
    const stub = `
import express from "express";
const app = express();

app.get("/", (req, res) => res.send("Backend restored by Enterprise Doctor"));

app.listen(4000, () => console.log("Backend running on port 4000"));
`;
    fs.writeFileSync(serverFile, stub, "utf8");

    actions.push({
      type: "create",
      file: serverFile,
      message: "Created missing server.js"
    });

    return actions;
  }

  const content = fs.readFileSync(serverFile, "utf8");

  if (!content.includes("app.listen")) {
    const patched = content + `

app.listen(4000, () => console.log("Backend running on port 4000"));
`;
    fs.writeFileSync(serverFile, patched, "utf8");

    actions.push({
      type: "patch",
      file: serverFile,
      message: "Injected missing app.listen()"
    });
  }

  return actions.length
    ? actions
    : [{ type: "ok", message: "Backend integrity already valid" }];
}
