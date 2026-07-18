import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const resolutions = await prisma.resolution.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { items: true }
  });
  console.log(JSON.stringify(resolutions, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
