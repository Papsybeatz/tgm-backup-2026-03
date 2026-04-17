import fs from 'fs';
const path = globalThis.ED_SAFE_PATH;

export default {
  id: 'fix-backend-file-consistency',
  description:
    'Removes backup files, resolves duplicates, normalizes module systems, and warns about circular imports.',

  async run({ projectRoot, backendPath, checkResult }) {
    const { details } = checkResult;
    const logs = [];

    // 1. Remove backup files
    for (const file of details.backupFiles) {
      fs.unlinkSync(file);
      logs.push(`Removed backup file: ${file}`);
    }

    // 2. Resolve duplicate files (keep first, remove others)
    for (const dup of details.duplicateFiles) {
      const [keep, ...remove] = dup.files;
      for (const file of remove) {
        fs.unlinkSync(file);
        logs.push(`Removed duplicate file: ${file}`);
      }
    }

    // 3. Normalize mixed module files (convert to ESM)
    for (const file of details.mixedModuleFiles) {
      let content = fs.readFileSync(file, 'utf8');

      content = content
        .replace(/module\.exports\s*=\s*/g, 'export default ')
        .replace(/const\s+(\w+)\s*=\s*require\(['"`](.*?)['"`]\)/g, 'import $1 from "$2"');

      fs.writeFileSync(file, content);
      logs.push(`Normalized module system to ESM: ${file}`);
    }

    // 4. Warn about circular imports (cannot auto-fix safely)
    if (details.circularImports.length > 0) {
      logs.push('Circular imports detected. Manual review recommended.');
    }

    return {
      ok: true,
      message: 'Backend file consistency repaired.',
      logs
    };
  }
};
