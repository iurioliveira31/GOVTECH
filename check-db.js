const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.resolution.findMany({ orderBy: { dataPublicacao: 'desc' }, take: 10 }).then(r => {
  console.log(JSON.stringify(r, null, 2));
  process.exit(0);
});
