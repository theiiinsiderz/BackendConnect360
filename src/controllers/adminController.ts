import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import prisma from '../prisma';
import { getTemplate } from '../templates/qrTemplates';

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

        // Fetch images as Buffers for PDFKit since it doesn't support remote URLs directly
        let logoBuffer: Buffer | null = null;
        if (company.logoUrl) {
            try {
                const response = await fetch(company.logoUrl);
                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    logoBuffer = Buffer.from(arrayBuffer);
                } else {
                    console.warn(`Failed to fetch logoUrl: ${response.statusText}`);
                }
            } catch (err) {
                console.error('Error fetching logoUrl:', err);
            }
        }

        let qrDesignBuffer: Buffer | null = null;
        if (company.qrDesignUrl) {
            try {
                const response = await fetch(company.qrDesignUrl);
                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    qrDesignBuffer = Buffer.from(arrayBuffer);
                } else {
                    console.warn(`Failed to fetch qrDesignUrl: ${response.statusText}`);
                }
            } catch (err) {
                console.error('Error fetching qrDesignUrl:', err);
            }
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

        // Brand colors (used for QR code color)
        const BRAND_ORANGE = '#F7931A';

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

                // ── Generate QR Code ──
                const qrColor = domainType === 'PET' ? '#1A2B48' : '#F7931A';
                const qrBuffer = await QRCode.toBuffer(`${SCAN_BASE_URL}/scan/${code}`, {
                    errorCorrectionLevel: 'H',
                    margin: 0,
                    color: {
                        dark: qrColor,
                        light: '#00000000' // transparent
                    }
                });

                if (y + tagSize + gapY > doc.page.height - 30) {
                    doc.addPage();
                    x = 30;
                    y = 30;
                    colCounter = 0;
                }

                // Draw Tag using domain-specific template
                const template = getTemplate(domainType);
                template(doc, x, y, tagSize, code, qrBuffer, company, logoBuffer);

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
        const { vendorId, search, page = '1', limit = '50' } = req.query;
        const p = parseInt(page as string) || 1;
        const l = parseInt(limit as string) || 50;

        const where: any = {
            status: 'ACTIVE'
        };

        if (vendorId) {
            where.companyId = vendorId as string;
        }

        if (search) {
            where.user = {
                name: {
                    contains: search as string,
                    mode: 'insensitive'
                }
            };
        }

        const [tags, total] = await Promise.all([
            prisma.tag.findMany({
                where,
                include: {
                    company: true,
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
                    bikeProfile: true,
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip: (p - 1) * l,
                take: l
            }),
            prisma.tag.count({ where })
        ]);

        res.status(200).json({
            tags,
            pagination: {
                total,
                page: p,
                limit: l,
                totalPages: Math.ceil(total / l)
            }
        });
    } catch (error) {
        console.error('Error fetching all active tags:', error);
        res.status(500).json({ message: 'Server error fetching tags', error });
    }
};


export const getTagsByType = async (req: Request, res: Response) => {
    try {
        const { type } = req.params;
        const { status, vendorId, search, page = '1', limit = '50' } = req.query;
        const p = parseInt(page as string) || 1;
        const l = parseInt(limit as string) || 50;

        const validTypes = ['CAR', 'BIKE', 'PET', 'KID'];

        if (!validTypes.includes(type.toUpperCase())) {
            return res.status(400).json({ message: 'Invalid domain type' });
        }

        const where: any = {
            domainType: type.toUpperCase() as any
        };

        if (status) {
            where.status = status.toString().toUpperCase() as any;
        }

        if (vendorId) {
            where.companyId = vendorId as string;
        }

        if (search) {
            where.user = {
                name: {
                    contains: search as string,
                    mode: 'insensitive'
                }
            };
        }

        const [tags, total] = await Promise.all([
            prisma.tag.findMany({
                where,
                include: {
                    company: true,
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
                    bikeProfile: true,
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip: (p - 1) * l,
                take: l
            }),
            prisma.tag.count({ where })
        ]);

        res.status(200).json({
            tags,
            pagination: {
                total,
                page: p,
                limit: l,
                totalPages: Math.ceil(total / l)
            }
        });
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

