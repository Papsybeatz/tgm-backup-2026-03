import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

// TODO: Replace with real auth middleware
function getUserId(req) {
  // Example: return req.user.id;
  return req.headers["x-user-id"] || "user_1"; // TEMP: replace with real user
}

// 1. Create a new grant
router.post("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized: userId missing" });
    const { title = "Untitled Grant", template, workspaceState = {} } = req.body;
    const now = new Date();
    const grant = await prisma.grant.create({
      data: {
        userId,
        title,
        status: "draft",
        workspaceState,
        createdAt: now,
        updatedAt: now,
        lastEditedAt: now,
      },
    });
    console.log("[API] Created grant:", grant);
    res.json(grant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get all grants for the current user
router.get("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized: userId missing" });
    const grants = await prisma.grant.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        status: true,
        lastEditedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { lastEditedAt: "desc" },
    });
    res.json(grants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Get a single grant (user-scoped)
router.get("/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const grant = await prisma.grant.findFirst({
      where: { id, userId },
    });
    console.log("[API] Fetch grant:", grant);
    if (!grant) return res.status(404).json({ error: "Not found" });
    res.json(grant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Update a grant (user-scoped, bump lastEditedAt)
router.put("/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { title, status, workspaceState } = req.body;
    const now = new Date();
    const grant = await prisma.grant.updateMany({
      where: { id, userId },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(workspaceState !== undefined ? { workspaceState } : {}),
        lastEditedAt: now,
        updatedAt: now,
      },
    });
    if (grant.count === 0) return res.status(404).json({ error: "Not found" });
    // Return updated grant
    const updated = await prisma.grant.findFirst({ where: { id, userId } });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
