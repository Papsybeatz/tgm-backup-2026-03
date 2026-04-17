import fs from "fs";
import path from "path";
import { resolvePrismaPath } from "../../system/prismaPathResolver.js";

export function prismaDiagnostics() {
  const { prismaDir, schemaPath } = resolvePrismaPath();

  const issues = [];

  if (!fs.existsSync(prismaDir)) {
    issues.push("Missing prisma directory");
  }

  if (!fs.existsSync(schemaPath)) {
    issues.push("Missing schema.prisma");
  }

  const clientDir = path.join(prismaDir, "..", "node_modules", "@prisma", "client");
  if (!fs.existsSync(clientDir)) {
    issues.push("Missing Prisma client");
  }

  return {
    prismaDir,
    schemaPath,
    issues,
  };
}
