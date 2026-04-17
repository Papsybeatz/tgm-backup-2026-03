// api/billing.js
import express from "express";
import { getAIUsage } from "../ai/usage.js";

const router = express.Router();

router.get("/dashboard", async (req, res) => {
  try {
    const month = req.query.month ? parseInt(req.query.month, 10) : undefined;
    const usage = await getAIUsage({ month });
    // Aggregate
    const totals = {
      totalCost: 0,
      perUser: {},
      perProvider: {},
      perPlan: {},
      topUsers: [],
      monthly: {},
    };
    for (const u of usage) {
      totals.totalCost += u.cost;
      totals.perUser[u.userId] = (totals.perUser[u.userId] || 0) + u.cost;
      totals.perProvider[u.provider] = (totals.perProvider[u.provider] || 0) + u.cost;
      // Optionally, add plan logic here
      const m = new Date(u.timestamp).getMonth();
      totals.monthly[m] = (totals.monthly[m] || 0) + u.cost;
    }
    totals.topUsers = Object.entries(totals.perUser)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId, cost]) => ({ userId, cost }));
    res.json(totals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
