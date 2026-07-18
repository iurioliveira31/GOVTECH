const { PrismaClient } = require('./packages/db/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const res = await prisma.resolution.findMany({
    where: { numero: { contains: '194' } }
  });
  console.log(res);
}
run();
