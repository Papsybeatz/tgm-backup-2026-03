const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || 'autotest+autosave_test@example.com';
  console.log('Inspecting user and drafts for:', email);
  const user = await prisma.user.findUnique({ where: { email } });
  console.log('user:', user);
  if (user) {
    const drafts = await prisma.draft.findMany({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' } });
    console.log('drafts:', drafts);
  } else {
    const draftsByEmail = await prisma.draft.findMany({ where: { userEmail: email }, orderBy: { updatedAt: 'desc' } });
    console.log('draftsByEmail:', draftsByEmail);
  }
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
