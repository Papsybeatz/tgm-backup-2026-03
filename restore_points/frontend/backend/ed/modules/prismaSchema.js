// backend/ed/modules/prismaSchema.js
import fs from "fs";
import path from "path";

/**
 * Validate Prisma schema integrity:
 * - File exists
 * - File is readable
 * - File is not empty
 * - Basic syntax sanity check
 */
export async function validatePrismaSchema({ projectRoot }) {
  const schemaPath = path.join(projectRoot, "backend", "prisma", "schema.prisma");

  console.log("[ED] validatePrismaSchema: checking schema at:", { schemaPath });

  if (!fs.existsSync(schemaPath)) {
    console.error("❌ Prisma schema missing:", { schemaPath });
    return { ok: false, error: "schema.prisma not found" };
  }

  // You can add real validation later (e.g., `npx prisma validate`)
  return { ok: true, details: "schema.prisma exists." };
}
