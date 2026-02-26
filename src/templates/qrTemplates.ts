import PDFDocument from 'pdfkit';
import { Company } from '@prisma/client';

export type TemplateFunction = (
    doc: typeof PDFDocument.prototype,
    x: number,
    y: number,
    tagSize: number,
    code: string,
    qrBuffer: Buffer,
    company: any, // Using any for simplicity in this file, or we can import Company type
    logoBuffer: Buffer | null
) => void;

const BRAND_BLUE = '#0C1E3E';
const BRAND_ORANGE = '#F7931A';
const BRAND_WHITE = '#FFFFFF';

// Colors for PET template
const PET_RED = '#FF5D5D';
const PET_DARK_BLUE = '#1A2B48';
const PET_LIME_GREEN = '#B9E4C9';
const PET_PAW_PEACH = '#FFE0C8';

export const drawCarTemplate: TemplateFunction = (doc, x, y, tagSize, code, qrBuffer, company, logoBuffer) => {
    const gapX = 15;
    const gapY = 25;

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
    const qrBoxSize = qrSize + 16; // 8px padding on each side
    const qrX = x + (tagSize - qrSize) / 2;
    const qrY = y + 18;
    const qrBoxX = qrX - 8;
    const qrBoxY = qrY - 8;

    doc.roundedRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 4)
        .lineWidth(2).stroke(BRAND_ORANGE);

    // 4b. QR Code Image
    doc.image(qrBuffer, qrX, qrY, { width: qrSize });

    // 5. "Emergency?" Text
    doc.font('Helvetica-Bold').fontSize(22).fillColor('#C4FF00') // Lime green
        .text('Emergency?', x, y + 68, { width: tagSize, align: 'center' });

    // 6. "Scan Here to call" Text
    doc.font('Helvetica-Bold').fontSize(12).fillColor(BRAND_WHITE)
        .text('Scan Here to call', x, y + 92, { width: tagSize, align: 'center' });

    // 6b. "Vehicle Owner" Text
    doc.font('Helvetica-Bold').fontSize(14).fillColor(BRAND_WHITE)
        .text('Vehicle Owner', x, y + 106, { width: tagSize, align: 'center' });

    // 7. Sponsor Logo Box
    const sponsorWidth = 120;
    const sponsorHeight = 30;
    const sponsorX = x + (tagSize - sponsorWidth) / 2;
    const sponsorY = y + 124;

    // Sponsor Box Border
    doc.roundedRect(sponsorX, sponsorY, sponsorWidth, sponsorHeight, 8)
        .lineWidth(1.5).stroke(BRAND_ORANGE);

    // Sponsor Box Fill
    doc.roundedRect(sponsorX + 3, sponsorY + 3, sponsorWidth - 6, sponsorHeight - 6, 6)
        .fill(BRAND_ORANGE);

    // Embed vendor logo if available, else show placeholder text
    if (logoBuffer) {
        try {
            doc.image(logoBuffer, sponsorX + 8, sponsorY + 4, {
                fit: [sponsorWidth - 16, sponsorHeight - 8],
                align: 'center',
                valign: 'center'
            });
        } catch (logoErr) {
            doc.font('Helvetica-Bold').fontSize(11).fillColor(BRAND_BLUE)
                .text(company.name, sponsorX, sponsorY + 10, { width: sponsorWidth, align: 'center' });
        }
    } else {
        doc.font('Helvetica-Bold').fontSize(11).fillColor(BRAND_BLUE)
            .text(company.name, sponsorX, sponsorY + 10, { width: sponsorWidth, align: 'center' });
    }

    // 8. Tag Code (Small print below the tag for admin reference)
    doc.font('Helvetica').fontSize(8).fillColor('#000000')
        .text(code, x, y + tagSize + 4, { width: tagSize, align: 'center' });
};

export const drawPetTemplate: TemplateFunction = (doc, x, y, tagSize, code, qrBuffer, company, logoBuffer) => {
    // 1. Tag Background
    doc.roundedRect(x, y, tagSize, tagSize, 25).fill(PET_RED);

    // 2. Border
    doc.roundedRect(x, y, tagSize, tagSize, 25)
        .lineWidth(5).stroke(PET_DARK_BLUE);

    // 3. Paw Print at the top
    const pawX = x + tagSize / 2;
    const pawY = y + 25;
    doc.fillColor(PET_PAW_PEACH);

    // Pad
    doc.circle(pawX, pawY + 5, 8).fill();
    doc.circle(pawX - 6, pawY + 8, 6).fill();
    doc.circle(pawX + 6, pawY + 8, 6).fill();

    // Toes
    doc.circle(pawX - 10, pawY - 4, 4).fill();
    doc.circle(pawX - 4, pawY - 8, 4).fill();
    doc.circle(pawX + 4, pawY - 8, 4).fill();
    doc.circle(pawX + 10, pawY - 4, 4).fill();

    // 4. White QR Box
    const qrContainerSize = 70;
    const qrContainerX = x + (tagSize - qrContainerSize) / 2;
    const qrContainerY = y + 45;

    doc.roundedRect(qrContainerX, qrContainerY, qrContainerSize, qrContainerSize, 8).fill(BRAND_WHITE);
    doc.roundedRect(qrContainerX, qrContainerY, qrContainerSize, qrContainerSize, 8)
        .lineWidth(2).stroke(PET_DARK_BLUE);

    // 4b. QR Code
    const qrSize = 54;
    doc.image(qrBuffer, qrContainerX + 8, qrContainerY + 8, { width: qrSize });

    // 5. Scan Me Oval
    const ovalWidth = 110;
    const ovalHeight = 40;
    const ovalX = x + (tagSize - ovalWidth) / 2;
    const ovalY = y + 115;

    doc.ellipse(x + tagSize / 2, ovalY + ovalHeight / 2, ovalWidth / 2, ovalHeight / 2).fill(PET_LIME_GREEN);

    // 6. "Scan Me" Text
    doc.font('Helvetica-Bold').fontSize(18).fillColor(PET_DARK_BLUE)
        .text('Scan Me', x, ovalY + 5, { width: tagSize, align: 'center' });

    // 7. "Help Your Pet Return" Text
    doc.font('Helvetica').fontSize(8).fillColor(PET_DARK_BLUE)
        .text('Help Your Pet Return', x, ovalY + 25, { width: tagSize, align: 'center' });

    // 8. "Proudly Sponsored" Text
    doc.font('Helvetica').fontSize(10).fillColor(PET_DARK_BLUE)
        .text('Proudly Sponsored', x, y + tagSize - 18, { width: tagSize, align: 'center' });

    // 9. Decorative Elements (Bones and Paw prints)
    doc.fillColor(PET_PAW_PEACH);

    // Bone top left
    const bone1X = x + 20;
    const bone1Y = y + 40;
    doc.save().translate(bone1X, bone1Y).rotate(-30)
        .circle(-4, 0, 3).circle(4, 0, 3).rect(-4, -1.5, 8, 3).fill()
        .restore();

    // Bone bottom right
    const bone2X = x + tagSize - 30;
    const bone2Y = y + tagSize - 40;
    doc.save().translate(bone2X, bone2Y).rotate(45)
        .circle(-4, 0, 3).circle(4, 0, 3).rect(-4, -1.5, 8, 3).fill()
        .restore();

    // Small paw bottom left
    const smallPawX = x + 30;
    const smallPawY = y + tagSize - 30;
    doc.save().translate(smallPawX, smallPawY).scale(0.5)
        .circle(0, 5, 8).circle(-6, 8, 6).circle(6, 8, 6)
        .circle(-10, -4, 4).circle(-4, -8, 4).circle(4, -8, 4).circle(10, -4, 4).fill()
        .restore();

    // 10. Vendor Name/Logo (if any)
    if (company.name !== 'Connect360 Default Company') {
        doc.font('Helvetica-Bold').fontSize(7).fillColor(PET_DARK_BLUE)
            .text(company.name, x, y + tagSize - 8, { width: tagSize, align: 'center' });
    }

    // 11. Tag Code (Small print below the tag)
    doc.font('Helvetica').fontSize(8).fillColor('#000000')
        .text(code, x, y + tagSize + 4, { width: tagSize, align: 'center' });

    // Note: Icons (dog, cat, rabbit) are skipped for now to keep it clean and programmatic.
};

export const drawBikeTemplate = drawCarTemplate; // Clone for now
export const drawKidTemplate = drawCarTemplate; // Clone for now

export const getTemplate = (domainType: string): TemplateFunction => {
    switch (domainType) {
        case 'PET': return drawPetTemplate;
        case 'BIKE': return drawBikeTemplate;
        case 'KID': return drawKidTemplate;
        default: return drawCarTemplate;
    }
};
