import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import prisma from '../prisma';

// QR codes encode a publicly accessible URL so ANY scanner app can open it.
// While in development without a domain, use Cloudflare Quick Tunnels:
// Run: 'npx cloudflared tunnel --url http://localhost:5000'
// Set SCAN_BASE_URL in your '.env' to the resulting tunnel URL.
const SCAN_BASE_URL = process.env.SCAN_BASE_URL || 'https://carcard.app';

export const generateBatch = async (req: Request, res: Response) => {
    try {
        let { quantity } = req.body;

        // Default to 100 if not provided or invalid
        if (!quantity || isNaN(quantity) || quantity < 1) {
            quantity = 100;
        }

        // Limit maximum quantity to prevent timeout/memory issues
        const MAX_QUANTITY = 10000;
        if (quantity > MAX_QUANTITY) {
            return res.status(400).json({ message: `Quantity cannot exceed ${MAX_QUANTITY}` });
        }

        const BATCH_SIZE = quantity;
        const generateRandomCode = (length: number = 8): string => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return `TAG-${result}`;
        };

        const tagsToCreate = [];
        const existingCodes = new Set();

        // PDF Setup
        const doc = new PDFDocument({ margin: 30, size: 'A4' });

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=generated_tags.pdf');

        doc.pipe(res);

        let x = 30;
        let y = 30;
        const tagSize = 165;
        const gapX = 15;
        const gapY = 25;
        const cols = 3;
        let colCounter = 0;

        // Colors
        const BRAND_BLUE = '#0C1E3E';
        const BRAND_ORANGE = '#F7931A';
        const BRAND_WHITE = '#FFFFFF';

        // Generate Codes and PDF Content
        while (tagsToCreate.length < BATCH_SIZE) {
            const code = generateRandomCode();
            if (!existingCodes.has(code)) {
                existingCodes.add(code);

                const tagData = {
                    code,
                    domainType: 'CAR' as const,
                    status: 'MINTED' as const,
                };
                tagsToCreate.push(tagData);

                // QR encodes a public URL — scannable by any third-party QR app
                const qrBuffer = await QRCode.toBuffer(`${SCAN_BASE_URL}/scan/${code}`, {
                    errorCorrectionLevel: 'H',
                    margin: 0,
                    color: {
                        dark: BRAND_ORANGE,
                        light: '#00000000' // transparent
                    }
                });

                if (y + tagSize + gapY > doc.page.height - 30) {
                    doc.addPage();
                    x = 30;
                    y = 30;
                    colCounter = 0;
                }

                // 1. Tag Background
                doc.roundedRect(x, y, tagSize, tagSize, 12).fill(BRAND_BLUE);

                // 2. Outer Orange Border (thick)
                doc.roundedRect(x + 5, y + 5, tagSize - 10, tagSize - 10, 10)
                    .lineWidth(2).stroke(BRAND_ORANGE);

                // 3. Inner Orange Border (thin)
                doc.roundedRect(x + 10, y + 10, tagSize - 20, tagSize - 20, 8)
                    .lineWidth(1).stroke(BRAND_ORANGE);

                // 4. Top QR Box
                const qrSize = 40;
                const qrX = x + (tagSize - qrSize) / 2;
                const qrY = y + 18;

                // QR Border
                doc.roundedRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 4)
                    .lineWidth(2).stroke(BRAND_ORANGE);
                // QR Image
                doc.image(qrBuffer, qrX, qrY, { width: qrSize });

                // 5. "Call Vehicle Owner" Text
                doc.font('Helvetica').fontSize(12).fillColor(BRAND_WHITE)
                    .text('Call Vehicle Owner', x, y + 72, { width: tagSize, align: 'center' });

                // 6. "Scan Me" Text
                doc.font('Helvetica-Bold').fontSize(26).fillColor(BRAND_WHITE)
                    .text('Scan Me', x, y + 84, { width: tagSize, align: 'center' });

                // 7. Sponsor Logo Box
                const sponsorWidth = 120;
                const sponsorHeight = 32;
                const sponsorX = x + (tagSize - sponsorWidth) / 2;
                const sponsorY = y + 120;

                // Sponsor Box Border
                doc.roundedRect(sponsorX, sponsorY, sponsorWidth, sponsorHeight, 8)
                    .lineWidth(1.5).stroke(BRAND_ORANGE);

                // Sponsor Box Fill
                doc.roundedRect(sponsorX + 3, sponsorY + 3, sponsorWidth - 6, sponsorHeight - 6, 6)
                    .fill(BRAND_ORANGE);

                // Sponsor Box Text
                // Center text vertically: sponsorY + 3 (padding) + ~7 (half font size space) = sponsorY + 11
                doc.font('Helvetica-Bold').fontSize(11).fillColor(BRAND_BLUE)
                    .text('Sponsor Logo Here', sponsorX, sponsorY + 11, { width: sponsorWidth, align: 'center' });

                // 8. Tag Code (Small print below the tag for admin reference)
                doc.font('Helvetica').fontSize(8).fillColor('#000000')
                    .text(code, x, y + tagSize + 4, { width: tagSize, align: 'center' });

                // Advance Layout
                colCounter++;
                if (colCounter >= cols) {
                    colCounter = 0;
                    x = 30;
                    y += tagSize + gapY;
                } else {
                    x += tagSize + gapX;
                }
            }
        }

        doc.end();

        // Async Insert into DB (fire and forget or wait? For 5000, better to wait to confirm)
        // Note: In production, this might be better as a background job (Bull/Redis)
        // But for this requirement, we'll await it.

        const CHUNK_SIZE = 100;
        for (let i = 0; i < tagsToCreate.length; i += CHUNK_SIZE) {
            const chunk = tagsToCreate.slice(i, i + CHUNK_SIZE);
            await prisma.tag.createMany({
                data: chunk,
                skipDuplicates: true
            });
        }

        console.log(`✅ Admin generated ${tagsToCreate.length} tags.`);

    } catch (error) {
        console.error('Batch Generation Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Server error generating tags', error });
        }
    }
};
