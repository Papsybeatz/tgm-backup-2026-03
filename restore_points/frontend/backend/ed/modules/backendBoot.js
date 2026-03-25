// backend/ed/modules/backendBoot.js

import path from "path";
import { pathToFileURL } from "url";

export async function checkBackendBoot({ projectRoot }) {
  const serverPath = path.join(projectRoot, "backend", "server.js");
  const serverUrl = pathToFileURL(serverPath).href;

  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.trim() === "") {
    return {
      ok: false,
      error: "GROQ_API_KEY is missing or empty.",
      degrade: true
    };
  }

  try {
    await import(serverUrl);
    return { ok: true, details: "Backend server module loaded successfully." };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
