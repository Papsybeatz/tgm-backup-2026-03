// prismaSchemaAutoPatch.js
import fs from "fs";
import path from "path";

export function autoPatchPrismaSchema({ projectRoot }) {
  const schemaPath = path.join(projectRoot, "backend", "prisma", "schema.prisma");

  if (!fs.existsSync(schemaPath)) {
    return { ok: false, error: "schema.prisma missing" };
  }

  let schema = fs.readFileSync(schemaPath, "utf8");
  let original = schema;

  // Ensure datasource has url
  if (/datasource\s+db\s+{[^}]*provider\s*=/.test(schema) && !/url\s*=/.test(schema)) {
    schema = schema.replace(
      /datasource\s+db\s+{([^}]*)}/,
      (match, inner) => {
        return `datasource db {\n${inner.trim()}\n  url = env(\"DATABASE_URL\")\n}`;
      }
    );
  }

  if (schema !== original) {
    fs.writeFileSync(schemaPath, schema, "utf8");
    return { ok: true, patched: true };
  }

  return { ok: true, patched: false };
}
