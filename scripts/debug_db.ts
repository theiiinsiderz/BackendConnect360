import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const tags = await prisma.tag.findMany({
        take: 30,
        orderBy: { createdAt: 'desc' }
    });
    console.log('--- TAGS IN DATABASE ---');
    console.log(JSON.stringify(tags, null, 2));
    console.log('------------------------');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
