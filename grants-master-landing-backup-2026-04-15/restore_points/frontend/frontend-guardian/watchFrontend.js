import http from "http";

function checkFrontend({ host = "127.0.0.1", port = 5173, path = "/", intervalMs = 10000 }) {
  setInterval(() => {
    const url = `http://${host}:${port}${path}`;
    const start = Date.now();

    const req = http.get(url, res => {
      const ms = Date.now() - start;
      if (res.statusCode === 200) {
        console.log(`[FG] Frontend OK (${ms}ms)`);
      } else {
        console.error(`[FG] Frontend status ${res.statusCode} (${ms}ms)`);
      }
    });

    req.on("error", err => {
      console.error("[FG] Frontend unreachable:", err.message);
    });

    req.setTimeout(5000, () => {
      console.error("[FG] Frontend timeout.");
      req.destroy();
    });
  }, intervalMs);
}

checkFrontend({});
