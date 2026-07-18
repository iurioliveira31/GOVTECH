const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.resolution.deleteMany({ where: { status: 'ERROR' } }).then(r => {
  console.log('Deletadas resolucoes com erro:', r.count);
  process.exit(0);
});
