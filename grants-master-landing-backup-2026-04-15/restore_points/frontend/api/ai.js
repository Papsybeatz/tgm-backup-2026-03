import { Router } from "express";
const router = Router();



import dotenv from "dotenv";
dotenv.config();
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

router.post("/", async (req, res) => {
  try {
    const { input } = req.body;
    if (!input) {
      return res.status(400).json({ error: "Missing input" });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a helpful grant writing assistant." },
        { role: "user", content: input }
      ]
    });

    const output = completion.choices[0]?.message?.content || "";
    res.json({ output });
  } catch (err) {
    console.error("[AI ERROR]", err);
    res.status(500).json({ error: "AI request failed", details: err.message });
  }
});

export default router;
