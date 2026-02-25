import { PrismaClient, TagStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const tag = await prisma.tag.findFirst({
        where: { status: TagStatus.MINTED }
    });
    if (tag) {
        console.log(`CODE:${tag.code}`);
    } else {
        console.log('No minted tags found');
    }
    await prisma.$disconnect();
}

main();
