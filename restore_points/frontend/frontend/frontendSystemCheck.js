
// frontendSystemCheck.js
import path from "path";
import { fileURLToPath } from "url";
import http from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// This resolves to GrantsMasterVite/
const projectRoot = path.resolve(__dirname, "..", "..");

export async function frontendSystemCheck() {
  // Ping frontend health endpoint
  return new Promise((resolve) => {
    const url = "http://127.0.0.1:5173/";
    const req = http.get(url, (res) => {
      if (res.statusCode === 200) {
        resolve({ status: "HEALTHY", details: "Frontend responded 200 OK." });
      } else {
        resolve({ status: "DEGRADED", details: `Frontend responded ${res.statusCode}.` });
      }
    });
    req.on("error", (err) => {
      resolve({ status: "FAILING", details: `Frontend unreachable: ${err.message}` });
    });
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ status: "FAILING", details: "Frontend health check timed out." });
    });
  });
}
