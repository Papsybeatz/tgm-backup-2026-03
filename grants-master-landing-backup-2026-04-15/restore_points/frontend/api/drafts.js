import { Router } from "express";
import crypto from "crypto";

const router = Router();

router.post("/save", async (req, res) => {
  try {
    const { id, email, title, content } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Missing email" });
    }

    if (content === undefined || content === null) {
      return res.status(400).json({ error: "Missing content" });
    }

    const draft = {
      id: id || crypto.randomUUID(),
      email,
      title,
      content,
      updatedAt: new Date(),
    };

    res.json(draft);
  } catch (err) {
    console.error("[DRAFT SAVE ERROR]", err);
    res.status(500).json({ error: "Failed to save draft" });
  }
});

export default router;
