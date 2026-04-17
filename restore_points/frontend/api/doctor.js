import express from "express";
import { loadAllSnapshots, loadLatestSnapshot } from "../doctor/history/loader.mjs";

const router = express.Router();

router.get("/latest", (req, res) => {
  const latest = loadLatestSnapshot();
  if (!latest) return res.status(404).json({ error: "No snapshots found" });
  res.json(latest);
});

router.get("/history", (req, res) => {
  const all = loadAllSnapshots();
  res.json(all);
});

export default router;
