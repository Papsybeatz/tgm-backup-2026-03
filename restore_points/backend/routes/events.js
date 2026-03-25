import express from "express";
import { bus } from "../lib/eventBus.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const forward = (event) => (payload) => send(event, payload);

  const handlers = {
    created: forward("grant:created"),
    updated: forward("grant:updated"),
    improved: forward("grant:sectionImproved")
  };

  bus.on("grant:created", handlers.created);
  bus.on("grant:updated", handlers.updated);
  bus.on("grant:sectionImproved", handlers.improved);

  req.on("close", () => {
    bus.off("grant:created", handlers.created);
    bus.off("grant:updated", handlers.updated);
    bus.off("grant:sectionImproved", handlers.improved);
  });
});

export default router;
