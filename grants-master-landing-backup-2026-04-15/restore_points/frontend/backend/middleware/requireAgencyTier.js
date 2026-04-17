// backend/middleware/requireAgencyTier.js
import { prisma } from "../db/prismaClient.js";

export async function requireAgencyTier(req, res, next) {
  const tier = req.user.tier;
  if (tier !== "agency_starter" && tier !== "agency_unlimited") {
    return res.status(403).json({ error: "Agency tier required" });
  }
  next();
}

export async function enforceClientLimit(req, res, next) {
  const tier = req.user.tier;
  if (tier === "agency_unlimited") return next();
  const count = await prisma.client.count({ where: { agencyId: req.user.id } });
  if (count >= 5) {
    return res.status(403).json({ error: "Upgrade to add more clients" });
  }
  next();
}
