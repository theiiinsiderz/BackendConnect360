import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const phoneNumber = process.argv[2];

    if (!phoneNumber) {
        console.error('Please provide a phone number: npx ts-node scripts/makeAdmin.ts <PHONE_NUMBER>');
        process.exit(1);
    }

    try {
        const user = await prisma.user.update({
            where: { phoneNumber },
            data: { role: 'admin' }
        });
        console.log(`✅ User ${user.phoneNumber} is now an ADMIN.`);
    } catch (error) {
        console.error('❌ Failed to update user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
