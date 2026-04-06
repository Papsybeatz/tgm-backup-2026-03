// backend/ed/health.js
import http from "http";

export function startHealthServer(port = 5051) {
  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, timestamp: Date.now() }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(port, () => {
    console.log(`ED Health server running on http://127.0.0.1:${port}/health`);
  });

  return server;
}
