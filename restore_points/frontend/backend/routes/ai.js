
import { fileURLToPath } from "url";
import path from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import express from "express";
import { runAI } from "../utils/aiClient.js";

const router = express.Router();

// Canonical allowed actions
const ALLOWED_ACTIONS = [
  "improve_clarity",
  "expand_section",
  "rewrite_professional",
  "align_mission",
  "score_section",
  "apply_template"
];

// Canonical sections
const ALLOWED_SECTIONS = [
  "needs",
  "goals",
  "methods",
  "evaluation",
  "budget",
  "org_background"
];

// Canonical funders
const ALLOWED_FUNDERS = ["generic"];

router.post("/editor", async (req, res) => {
  const { action, section, title, content, funder, metadata } = req.body;

  // Validate action
  if (!ALLOWED_ACTIONS.includes(action)) {
    return res.status(400).json({ error: "Invalid action" });
  }

  // Validate content
  if (typeof content !== "string") {
    return res.status(400).json({ error: "Content must be a string" });
  }

  // Validate section if provided
  if (section && !ALLOWED_SECTIONS.includes(section)) {
    return res.status(400).json({ error: "Invalid section" });
  }

  // Validate funder if provided
  if (funder && !ALLOWED_FUNDERS.includes(funder)) {
    return res.status(400).json({ error: "Invalid funder" });
  }

  // Validate metadata
  if (!metadata || !metadata.timestamp) {
    return res.status(400).json({ error: "Missing metadata.timestamp" });
  }

  // Build prompt
  const prompt = buildPrompt({ action, section, title, content, funder });

  // Run AI
  const output = await runAI(prompt);

  // Score action returns JSON
  if (action === "score_section") {
    try {
      const parsed = JSON.parse(output);
      return res.json(parsed);
    } catch {
      return res.status(500).json({ error: "Invalid JSON from scoring agent" });
    }
  }

  // All other actions return text
  return res.json({ output });
});

export default router;

// Prompt builder
function buildPrompt({ action, section, title, content, funder }) {
  switch (action) {
    case "improve_clarity":
      return `
You are the GrantsMaster Draft Editor Agent.
Task: Improve clarity.
Section: ${section}
Funder: ${funder}
Content:
${content}
      `;

    case "expand_section":
      return `
You are the GrantsMaster Draft Editor Agent.
Task: Expand the section with more detail and depth.
Section: ${section}
Funder: ${funder}
Content:
${content}
      `;

    case "rewrite_professional":
      return `
You are the GrantsMaster Draft Editor Agent.
Task: Rewrite professionally for a grant reviewer audience.
Section: ${section}
Funder: ${funder}
Content:
${content}
      `;

    case "align_mission":
      return `
You are the GrantsMaster Draft Editor Agent.
Task: Align the content with the funder's mission and priorities.
Funder: ${funder}
Section: ${section}
Content:
${content}
      `;

    case "score_section":
      return `
You are the GrantsMaster Scoring Agent.
Task: Score this section from 0–100 based on clarity, funder alignment, specificity, and completeness.
Funder: ${funder}
Section: ${section}
Content:
${content}

Return JSON:
{
  "score": number,
  "feedback": "string"
}
      `;

    case "apply_template":
      return `
You are the GrantsMaster Template Agent.
Task: Provide the template for this funder and section.
Funder: ${funder}
Section: ${section}

Return only the template text.
      `;
  }
}
