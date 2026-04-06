import express from "express";
import prisma from "../db/prismaClient.js";
import { requireAuth } from "../middleware/roleAuth.js";
// import { requireTier } from "../middleware/requireTier.js";
import { createAI } from "../../ai/client.js";

const router = express.Router();

router.post(
  "/:id/score",
  requireAuth,
  // requireTier("pro"),
  async (req, res) => {
    const { grantId } = req.body;

    const draft = await prisma.draft.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!draft) return res.status(404).json({ error: "Draft not found" });

    let grant = null;
    if (grantId) {
      grant = await prisma.grantCatalog.findUnique({ where: { id: grantId } });
    }

    const prompt = `
You are an expert grant reviewer. Score the following grant draft.

Draft:
${draft.content}

${grant ? `Funder Criteria:
Title: ${grant.title}
Sector: ${grant.sector}
Funding Range: ${grant.minAmount}-${grant.maxAmount}
Tags: ${grant.tags.join(", ")}
Deadline: ${grant.deadline}
` : ""}

Provide a JSON object with:
{
  "overall": number, // 0-100
  "subscores": {
    "Clarity": number,
    "Feasibility": number,
    "Alignment with mission": number,
    "Budget justification": number,
    "Evaluation plan": number,
    "Narrative strength": number${grant ? ',\n    "Alignment with funder criteria": number' : ""}
  },
  "strengths": [string],
  "weaknesses": [string],
  "recommendations": [string]
}
`;

    const ai = createAI(process.env);
    const aiResult = await ai.generate({ prompt });
    const result = aiResult.output || aiResult;

    let scoring;
    try {
      scoring = typeof result === "string" ? JSON.parse(result) : result;
    } catch (e) {
      return res.status(500).json({ error: "AI did not return valid JSON", raw: result });
    }

    res.json({ scoring });
  }
);

export default router;
