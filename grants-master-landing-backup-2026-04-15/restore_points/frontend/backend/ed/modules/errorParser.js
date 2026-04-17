// ED Error Parsing Module
import fs from "fs";
import { edLog } from "../logger.js";

export async function errorParser(logPath = "backend/ed/ed.log") {
  if (!fs.existsSync(logPath)) {
    edLog("No error log found for parsing.");
    return;
  }
  const log = fs.readFileSync(logPath, "utf8");
  const lines = log.split("\n");
  for (const line of lines) {
    if (line.includes("PrismaClientInitializationError")) {
      edLog("Detected PrismaClientInitializationError. Triggering prismaGenerateCheck.");
      // You would call prismaGenerateCheck() here
    }
    if (line.includes("Module not found") || line.includes("Cannot find module")) {
      edLog("Detected module import error. Triggering routerIntegrityCheck.");
      // You would call routerIntegrityCheck() here
    }
    if (line.includes("404") && line.includes("Route")) {
      edLog("Detected route 404. Triggering routeMountCheck.");
      // You would call routeMountCheck() here
    }
    // Add more error patterns as needed
  }
}
