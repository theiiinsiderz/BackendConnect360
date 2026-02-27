import { DomainType, PrismaClient, TagStatus } from '@prisma/client';
import dotenv from 'dotenv';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

// Load environment variables from .env
dotenv.config();

// ── QR Code URL Configuration ──
// QR codes encode a publicly accessible URL so that ANY QR scanner app
// can open the tag's public scan page in a browser.
const SCAN_BASE_URL = process.env.SCAN_BASE_URL;

// ── Parse Command Line Arguments ──
// Usage: npx ts-node scripts/generateTags.ts [DOMAIN] [AMOUNT]
// Example: npx ts-node scripts/generateTags.ts PET 500
const args = process.argv.slice(2);
const requestedDomainStr = (args[0] || 'CAR').toUpperCase();
const BATCH_SIZE = parseInt(args[1] || '100', 10);
const CHUNK_SIZE = 100;

const isValidDomain = (d: string): d is keyof typeof DomainType => Object.keys(DomainType).includes(d);

if (!isValidDomain(requestedDomainStr)) {
    console.error(`\n❌ ERROR: Invalid domain type "${requestedDomainStr}". Must be CAR, KID, or PET.`);
    process.exit(1);
}

const domainType = DomainType[requestedDomainStr as keyof typeof DomainType];

// ──────────────────────────────────────────────

const prisma = new PrismaClient();

const generateRandomCode = (length: number = 8): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `TAG-${result}`;
};

const domainConfigs: Record<DomainType, {
    primary: string;
    secondary: string;
    text: string;
    cta: string;
    domainLabel: string;
}> = {
    [DomainType.CAR]: {
        primary: '#0C1E3E', // Deep Navy
        secondary: '#F7931A', // Brand Orange
        text: '#FFFFFF',
        cta: 'Call Vehicle Owner',
        domainLabel: 'VEHICLE TAG',
    },
    [DomainType.BIKE]: {
        primary: '#2B8A3E', // Forest Green
        secondary: '#FFD43B', // Bright Yellow
        text: '#FFFFFF',
        cta: 'Contact Bike Owner',
        domainLabel: 'BIKE TAG',
    },
    [DomainType.KID]: {
        primary: '#1864AB', // Trust Blue
        secondary: '#FAB005', // Warm Yellow
        text: '#FFFFFF',
        cta: 'Contact Guardian',
        domainLabel: 'KIDS SAFETY TAG',
    },
    [DomainType.PET]: {
        primary: '#E85D04', // Energetic Orange
        secondary: '#432818', // Espresso Brown
        text: '#FFFFFF',
        cta: 'Contact Owner',
        domainLabel: 'PET IDENTITY TAG',
    },
};

const config = domainConfigs[domainType];

// ─── Main ───

async function main() {
    console.log(`🚀 Starting batch generation of ${BATCH_SIZE} blank tags for domain ${domainType}...`);

    // Get or create default company
    let company = await prisma.company.findFirst();
    if (!company) {
        company = await prisma.company.create({
            data: {
                name: 'Default Company',
                contactEmail: 'admin@connect360.com',
            },
        });
        console.log(`✅ Created default company: ${company.id}`);
    }

    const tagsToCreate: any[] = [];
    const existingCodes = new Set<string>();

    // PDF Setup
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    const outputFileName = `generated_${domainType.toLowerCase()}_tags.pdf`;
    const outputStream = fs.createWriteStream(outputFileName);
    doc.pipe(outputStream);

    console.log(`📄 Generating PDF with domain-specific design to ${outputFileName}...`);

    const tagSize = 165;
    const gapX = 15;
    const gapY = 25;
    const cols = 3;
    let x = 40;
    let y = 40;
    let colCounter = 0;

    // 1. Generate unique codes and PDF content
    while (tagsToCreate.length < BATCH_SIZE) {
        const code = generateRandomCode();
        if (!existingCodes.has(code)) {
            existingCodes.add(code);
            tagsToCreate.push({
                code,
                domainType,
                status: TagStatus.MINTED,
                companyId: company.id,
            });

            // ── Generate QR Code with public URL ──
            const qrData = `${SCAN_BASE_URL}/scan/${code}`;
            const qrBuffer = await QRCode.toBuffer(qrData, {
                errorCorrectionLevel: 'H',
                margin: 1,
                color: {
                    dark: config.secondary,
                    light: '#00000000', // transparent
                },
            });

            // Add to PDF
            if (y + tagSize + gapY > doc.page.height - 40) {
                doc.addPage();
                x = 40;
                y = 40;
                colCounter = 0;
            }

            // Draw Tag Background
            doc.roundedRect(x, y, tagSize, tagSize, 12).fill(config.primary);

            // Draw Borders
            doc.roundedRect(x + 5, y + 5, tagSize - 10, tagSize - 10, 10).lineWidth(2).stroke(config.secondary);
            doc.roundedRect(x + 10, y + 10, tagSize - 20, tagSize - 20, 8).lineWidth(1).stroke(config.secondary);

            // Draw QR Code
            const qrImageSize = 70;
            const qrX = x + (tagSize - qrImageSize) / 2;
            const qrY = y + 25;
            doc.image(qrBuffer, qrX, qrY, { width: qrImageSize });

            // Draw CTA Text
            doc.font('Helvetica-Bold').fontSize(11).fillColor(config.text)
                .text(config.cta, x, y + tagSize - 45, { width: tagSize, align: 'center' });

            // Draw Domain Label
            doc.font('Helvetica').fontSize(14).fillColor(config.text)
                .text('SCAN ME', x, y + tagSize - 30, { width: tagSize, align: 'center' });

            // Draw Code Reference (Outside the colored box)
            doc.font('Helvetica').fontSize(7).fillColor('#666666')
                .text(`${code} | ${config.domainLabel}`, x, y + tagSize + 4, { width: tagSize, align: 'center' });

            colCounter++;
            if (colCounter >= cols) {
                colCounter = 0;
                x = 40;
                y += tagSize + gapY;
            } else {
                x += tagSize + gapX;
            }
        }
    }

    doc.end();
    console.log(`✅ Generated ${tagsToCreate.length} blank QR codes with themed designs.`);

    // 2. Insert into DB in chunks
    let insertedCount = 0;
    for (let i = 0; i < tagsToCreate.length; i += CHUNK_SIZE) {
        const chunk = tagsToCreate.slice(i, i + CHUNK_SIZE);
        try {
            await prisma.tag.createMany({
                data: chunk.map((t: any) => ({
                    code: t.code,
                    domainType: t.domainType,
                    status: t.status,
                    companyId: t.companyId,
                })),
                skipDuplicates: true,
            });
            insertedCount += chunk.length;
            process.stdout.write(`\rCreating tags: ${insertedCount}/${BATCH_SIZE}`);
        } catch (error) {
            console.error(`\n❌ Error inserting chunk ${i}:`, error);
        }
    }

    console.log(`\n✨ Successfully inserted ${insertedCount} tags into the database.`);
    console.log(`📄 PDF saved to ${outputFileName}`);
    console.log('🔗 All QR codes encode public scan URLs — scannable by any QR reader.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
