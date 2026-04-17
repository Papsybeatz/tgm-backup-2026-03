import path from "path";
import { fileURLToPath } from "url";

export function resolvePrismaPath() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Always resolve relative to backend root
  const backendRoot = path.resolve(__dirname, "..");
  const prismaDir = path.join(backendRoot, "prisma");
  const schemaPath = path.join(prismaDir, "schema.prisma");

  return { prismaDir, schemaPath };
}
