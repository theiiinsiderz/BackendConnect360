import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function activateAllTags() {
    try {
        console.log('🔄 Activating all tags and enabling all communication options...');
        
        const result = await prisma.tag.updateMany({
            data: {
                status: 'ACTIVE',
                allowMaskedCall: true,
                allowWhatsapp: true,
                allowSms: true,
                showEmergencyContact: true
            }
        });

        console.log(`✅ Successfully updated ${result.count} tags`);
        console.log('   - Status: ACTIVE');
        console.log('   - Call: Enabled');
        console.log('   - WhatsApp: Enabled');
        console.log('   - SMS: Enabled');
        
    } catch (error) {
        console.error('❌ Error activating tags:', error);
    } finally {
        await prisma.$disconnect();
    }
}

activateAllTags();
