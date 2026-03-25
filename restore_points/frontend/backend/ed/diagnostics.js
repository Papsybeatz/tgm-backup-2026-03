// ED CLI: Run Prisma diagnostics and print results
import { runPrismaDiagnostics } from './modules/prismaClientDiagnostics.js';

async function main() {
  const result = await runPrismaDiagnostics();
  console.log('[ED] Prisma Diagnostics:', result);
}

main();
