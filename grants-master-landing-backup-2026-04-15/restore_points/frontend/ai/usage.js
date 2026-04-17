// ai/usage.js
// Simple usage tracking engine for AI requests
import fs from "node:fs/promises";
import path from "node:path";

const USAGE_FILE = path.resolve(process.env.AI_USAGE_PATH || "./ai-usage.json");

export async function logAIUsage({ userId, provider, model, tokensIn, tokensOut, cost, timestamp }) {
  let usage = [];
  try {
    const raw = await fs.readFile(USAGE_FILE, "utf8");
    usage = JSON.parse(raw);
  } catch {}
  usage.push({ userId, provider, model, tokensIn, tokensOut, cost, timestamp });
  await fs.writeFile(USAGE_FILE, JSON.stringify(usage, null, 2));
}

export async function getAIUsage({ month }) {
  let usage = [];
  try {
    const raw = await fs.readFile(USAGE_FILE, "utf8");
    usage = JSON.parse(raw);
  } catch {}
  if (month) {
    usage = usage.filter(u => new Date(u.timestamp).getMonth() === month);
  }
  return usage;
}
