import { DomainType, PrismaClient, TagStatus } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding sample activated tags for CAR, PET, and KID domains...');

    // 1. Create or Find testing User
    const user = await prisma.user.upsert({
        where: { phoneNumber: '+910000000000' },
        update: {},
        create: {
            phoneNumber: '+910000000000',
            name: 'Demo Tester',
            email: 'tester@carcard.app',
            role: 'user'
        }
    });

    console.log(`👤 Found/Created test user: ${user.phoneNumber}`);

    // --- CAR SAMPLE ---
    const carTagCode = 'TAG-DEMOCAR1';
    await prisma.tag.upsert({
        where: { code: carTagCode },
        update: {},
        create: {
            code: carTagCode,
            domainType: DomainType.CAR,
            status: TagStatus.ACTIVE,
            userId: user.id,
            nickname: 'My Tesla',
            carProfile: {
                create: {
                    vehicleType: 'Tesla Model 3 · Electric Blue',
                    plateNumber: 'MH 12 AB 1234',
                    emergencyContacts: [
                        { name: 'Home', phone: '+919999999999' }
                    ]
                }
            }
        }
    });
    console.log(`✅ Generated Active CAR Tag: ${carTagCode}`);

    // --- PET SAMPLE ---
    const petTagCode = 'TAG-DEMOPET1';
    await prisma.tag.upsert({
        where: { code: petTagCode },
        update: {},
        create: {
            code: petTagCode,
            domainType: DomainType.PET,
            status: TagStatus.ACTIVE,
            userId: user.id,
            nickname: 'Buddy',
            petProfile: {
                create: {
                    petName: 'Buddy',
                    breedInfo: 'Golden Retriever · 3 Years Old',
                    ownerContact: {
                        name: 'Demo Tester',
                        phone: '+910000000000',
                        allowWhatsApp: true
                    },
                    vetContact: {
                        name: 'Happy Paws Clinic',
                        phone: '+911111111111'
                    }
                }
            }
        }
    });
    console.log(`✅ Generated Active PET Tag: ${petTagCode}`);

    // --- KID SAMPLE ---
    const kidTagCode = 'TAG-DEMOKID1';
    await prisma.tag.upsert({
        where: { code: kidTagCode },
        update: {},
        create: {
            code: kidTagCode,
            domainType: DomainType.KID,
            status: TagStatus.ACTIVE,
            userId: user.id,
            nickname: 'Aarav',
            kidProfile: {
                create: {
                    displayName: 'Aarav',
                    primaryGuardian: {
                        name: 'Demo Tester',
                        phone: '+910000000000',
                        relation: 'Parent'
                    },
                    medicalAlerts: 'Peanut Allergy · Carry EpiPen',
                    requireLocationShare: true
                }
            }
        }
    });
    console.log(`✅ Generated Active KID Tag: ${kidTagCode}`);

    console.log('\n✨ Seeding complete! You can now scan these tags:');
    console.log(`🚗 CAR: http://localhost:5000/api/v1/scan/${carTagCode}`);
    console.log(`🐕 PET: http://localhost:5000/api/v1/scan/${petTagCode}`);
    console.log(`👦 KID: http://localhost:5000/api/v1/scan/${kidTagCode}`);
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
