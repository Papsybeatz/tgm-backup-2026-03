import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const router = express.Router();

router.get("/", async (req, res) => {
  const healthUrl = "http://localhost:5173/health.json";
  let frontendHealth = null;

  try {
    const response = await fetch(healthUrl);
    frontendHealth = await response.json();
  } catch (err) {
    frontendHealth = {
      status: "down",
      error: "Frontend unreachable",
      timestamp: new Date().toISOString()
    };
  }

  const logsDir = path.join(process.cwd(), "frontend", "ed", "state");
  const logs = {};

  if (fs.existsSync(logsDir)) {
    const files = fs.readdirSync(logsDir);
    for (const file of files) {
      logs[file] = fs.readFileSync(path.join(logsDir, file), "utf8");
    }
  }

  res.json({
    frontendHealth,
    logs
  });
});

router.get("/frontend-health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
