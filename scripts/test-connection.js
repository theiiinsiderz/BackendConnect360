const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    try {
        await prisma.$connect();
        console.log('✅ Connected successfully');
        const count = await prisma.tag.count();
        console.log(`Tag count: ${count}`);
    } catch (e) {
        console.error('❌ Connection failed', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
