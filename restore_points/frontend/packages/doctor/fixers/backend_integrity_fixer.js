import fs from "fs";
import * as path from "node:path";

export default async function fixBackendIntegrity({ projectRoot, checkResult }) {
  const serverPath = path.join(projectRoot, "server.js");

  // Only run if the check failed
  if (checkResult.status !== "fail") {
    return {
      id: "backend_integrity_fixer",
      status: "skip",
      message: "Backend integrity is healthy. No fix needed."
    };
  }

  // Clean, known-good server.js template
  const cleanServer = `import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import aiRouter from './api/ai.js';

const app = express();
const PORT = 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Log API key presence
console.log("OPENAI_API_KEY loaded:", !!process.env.OPENAI_API_KEY);

// AI route
app.use('/api/ai', aiRouter);
console.log('✓ AI endpoint /api/ai enabled');

// LemonSqueezy signing secret
const LEMONSQUEEZY_SIGNING_SECRET = process.env.LEMONSQUEEZY_SIGNING_SECRET || "";

// Signature verification helper
function verifySignature(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return hash === signature;
}

// LemonSqueezy webhook
app.post(
  '/api/lemon-webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    try {
      const signature = req.headers['x-signature'];
      const rawBody = req.body.toString();

      if (!verifySignature(rawBody, signature, LEMONSQUEEZY_SIGNING_SECRET)) {
        console.log("❌ Invalid webhook signature");
        return res.status(403).send("Invalid signature");
      }

      console.log("✓ Webhook verified");
      res.status(200).send("OK");
    } catch (err) {
      console.error("Webhook error:", err);
      res.status(500).send("Server error");
    }
  }
);

// Health check
app.get('/', (req, res) => {
  res.send('Grants Master backend is live');
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Backend running at http://localhost:' + PORT);
});
`;

  // Write the clean file
  fs.writeFileSync(serverPath, cleanServer, "utf8");

  return {
    id: "backend_integrity_fixer",
    status: "fixed",
    message: "server.js was corrupted and has been rewritten to a clean, stable version.",
    details: {
      overwrittenFile: serverPath,
      problemsFixed: checkResult.details?.problems || []
    }
  };
}
