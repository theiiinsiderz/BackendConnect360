import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import prisma from '../prisma';

// QR codes encode a publicly accessible URL so ANY scanner app can open it.
// While in development without a domain, use Cloudflare Quick Tunnels:
// Run: 'npx cloudflared tunnel --url http://localhost:5000'
// Set SCAN_BASE_URL in your '.env' to the resulting tunnel URL.
const SCAN_BASE_URL = process.env.SCAN_BASE_URL || 'https://carcard.app';

export const addAdmin = async (req: Request, res: Response) => {
    try {
        const { phoneNumber, name, email } = req.body;

        if (!phoneNumber || typeof phoneNumber !== 'string') {
            return res.status(400).json({ message: 'Phone number is required' });
        }

        const normalizedPhoneNumber = phoneNumber.trim();
        const normalizedName = typeof name === 'string' ? name.trim() : undefined;
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : undefined;

        const existingUser = await prisma.user.findUnique({
            where: { phoneNumber: normalizedPhoneNumber }
        });

        if (existingUser?.role === 'ADMIN') {
            return res.status(200).json({
                message: 'User is already an admin',
                user: {
                    id: existingUser.id,
                    phoneNumber: existingUser.phoneNumber,
                    name: existingUser.name,
                    email: existingUser.email,
                    role: existingUser.role
                }
            });
        }

        if (existingUser) {
            const updatedAdmin = await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                    role: 'ADMIN',
                    ...(normalizedName ? { name: normalizedName } : {}),
                    ...(normalizedEmail ? { email: normalizedEmail } : {})
                }
            });

            return res.status(200).json({
                message: 'Existing user promoted to admin',
                user: {
                    id: updatedAdmin.id,
                    phoneNumber: updatedAdmin.phoneNumber,
                    name: updatedAdmin.name,
                    email: updatedAdmin.email,
                    role: updatedAdmin.role
                }
            });
        }

        const createdAdmin = await prisma.user.create({
            data: {
                phoneNumber: normalizedPhoneNumber,
                role: 'ADMIN',
                ...(normalizedName ? { name: normalizedName } : {}),
                ...(normalizedEmail ? { email: normalizedEmail } : {})
            }
        });

        return res.status(201).json({
            message: 'New admin created successfully',
            user: {
                id: createdAdmin.id,
                phoneNumber: createdAdmin.phoneNumber,
                name: createdAdmin.name,
                email: createdAdmin.email,
                role: createdAdmin.role
            }
        });
    } catch (error) {
        console.error('Add Admin Error:', error);
        return res.status(500).json({ message: 'Server error while adding admin' });
    }
};

export const generateBatch = async (req: Request, res: Response) => {
    try {
        let { quantity, vendorId, domainType } = req.body;

        // Default to 100 if not provided or invalid
        if (!quantity || isNaN(quantity) || quantity < 1) {
            quantity = 100;
        }

        // Default to 'CAR' if not provided or invalid
        if (!domainType || !['CAR', 'BIKE', 'PET', 'KID'].includes(domainType)) {
            domainType = 'CAR';
        }

        // Limit maximum quantity to prevent timeout/memory issues
        const MAX_QUANTITY = 10000;
        if (quantity > MAX_QUANTITY) {
            return res.status(400).json({ message: `Quantity cannot exceed ${MAX_QUANTITY}` });
        }

        // Fetch company/vendor with logo and qrDesign
        let company;
        if (vendorId && typeof vendorId === 'string' && vendorId.trim()) {
            company = await prisma.company.findUnique({
                where: { id: vendorId.trim() }
            });

            if (!company) {
                return res.status(400).json({ message: 'Invalid vendor ID' });
            }
        } else {
            // Fallback: use first company or create default
            company = await prisma.company.findFirst({
                orderBy: { createdAt: 'asc' }
            });

            if (!company) {
                company = await prisma.company.create({
                    data: { name: 'Connect360 Default Company' }
                });
            }
        }

        const resolvedCompanyId = company.id;

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
                    domainType: domainType as 'CAR' | 'BIKE' | 'PET' | 'KID',
                    status: 'MINTED' as const,
                    companyId: resolvedCompanyId,
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
                const qrBoxSize = qrSize + 16; // 8px padding on each side
                const qrX = x + (tagSize - qrSize) / 2;
                const qrY = y + 18;
                const qrBoxX = qrX - 8;
                const qrBoxY = qrY - 8;

                // 4a. QR Design Background (if available)
                if (company.qrDesignUrl) {
                    try {
                        doc.image(company.qrDesignUrl, qrBoxX, qrBoxY, { width: qrBoxSize, height: qrBoxSize });
                    } catch (designErr) {
                        console.warn('Failed to load QR design:', designErr);
                        // Fallback to orange border if design fails
                        doc.roundedRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 4)
                            .lineWidth(2).stroke(BRAND_ORANGE);
                    }
                } else {
                    // Default orange border
                    doc.roundedRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 4)
                        .lineWidth(2).stroke(BRAND_ORANGE);
                }

                // 4b. QR Code Image
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

                // Embed vendor logo if available, else show placeholder text
                if (company.logoUrl) {
                    try {
                        doc.image(company.logoUrl, sponsorX + 8, sponsorY + 6, { width: sponsorWidth - 16, height: sponsorHeight - 12 });
                    } catch (logoErr) {
                        console.warn('Failed to load vendor logo:', logoErr);
                        // Fallback to text placeholder
                        doc.font('Helvetica-Bold').fontSize(11).fillColor(BRAND_BLUE)
                            .text(company.name, sponsorX, sponsorY + 11, { width: sponsorWidth, align: 'center' });
                    }
                } else {
                    // Show company name if no logo
                    doc.font('Helvetica-Bold').fontSize(11).fillColor(BRAND_BLUE)
                        .text(company.name, sponsorX, sponsorY + 11, { width: sponsorWidth, align: 'center' });
                }

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



export const getAllActiveTags = async (req: Request, res: Response) => {
    try {
        const tags = await prisma.tag.findMany({
            where: {
                status: 'ACTIVE'
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phoneNumber: true,
                        avatar: true
                    }
                },
                carProfile: true,
                kidProfile: true,
                petProfile: true,
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.status(200).json(tags);
    } catch (error) {
        console.error('Error fetching all active tags:', error);
        res.status(500).json({ message: 'Server error fetching tags', error });
    }
};


export const getTagsByType = async (req: Request, res: Response) => {
    try {
        const { type } = req.params;
        const validTypes = ['CAR', 'KID', 'PET'];


        if (!validTypes.includes(type.toUpperCase())) {
            return res.status(400).json({ message: 'Invalid domain type' });
        }


        const tags = await prisma.tag.findMany({
            where: {
                domainType: type.toUpperCase() as any,
                status: 'ACTIVE'
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phoneNumber: true,
                        avatar: true
                    }
                },
                carProfile: true,
                kidProfile: true,
                petProfile: true,
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.status(200).json(tags);
    } catch (error) {
        console.error(`Error fetching tags of type ${req.params.type}:`, error);
        res.status(500).json({ message: 'Server error fetching tags by type', error });
    }
};


export const updateTag = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;


        // Prevent updating ID or domainType
        const { id: _, domainType: __, userId: ___, user: ____, ...allowedUpdates } = updates;


        const updatedTag = await prisma.tag.update({
            where: { id },
            data: allowedUpdates,
            include: {
                carProfile: true,
                kidProfile: true,
                petProfile: true,
            }
        });


        res.status(200).json({ message: 'Tag updated successfully', tag: updatedTag });
    } catch (error: any) {
        console.error(`Error updating tag ${req.params.id}:`, error);
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Tag not found' });
        }
        res.status(500).json({ message: 'Server error updating tag', error });
    }
};


export const deleteTag = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;


        await prisma.tag.delete({
            where: { id }
        });


        res.status(200).json({ message: 'Tag deleted successfully' });
    } catch (error: any) {
        console.error(`Error deleting tag ${req.params.id}:`, error);
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Tag not found' });
        }
        res.status(500).json({ message: 'Server error deleting tag', error });
    }
};

