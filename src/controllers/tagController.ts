import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

type DomainType = 'CAR' | 'BIKE' | 'PET' | 'KID';

// ── GET /tags ── List authenticated user's tags ──
export const getTags = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Not authenticated' });

        const tags = await prisma.tag.findMany({
            where: { userId },
            include: {
                scans: true,
                carProfile: true,
                kidProfile: true,
                petProfile: true
            },
        });

        // Map to frontend expectation while adhering to backend architecture
        const formattedTags = tags.map((tag: any) => {
            let config = {};
            if (tag.domainType === 'CAR') config = tag.carProfile || {};
            if (tag.domainType === 'KID') config = tag.kidProfile || {};
            if (tag.domainType === 'PET') config = tag.petProfile || {};

            return {
                ...tag,
                _id: tag.id, // Frontend uses _id
                config
            }
        });

        res.json(formattedTags);
    } catch (error) {
        console.error('Get Tags Error:', error);
        res.status(500).json({ message: 'Server error', error });
    }
};

// ── POST /tags ── Create a brand-new tag (manual entry) ──
export const createTag = async (req: Request, res: Response) => {
    try {
        const { code, nickname, domainType, companyId } = req.body;

        const existingTag = await prisma.tag.findUnique({ where: { code } });
        // @ts-ignore
        const userId = req.user?.id;

        if (existingTag) {
            if (!existingTag.userId && existingTag.status === 'MINTED') {
                if (!userId) return res.status(401).json({ message: 'Not authenticated' });

                const updatedTag = await prisma.tag.update({
                    where: { id: existingTag.id },
                    data: {
                        userId,
                        nickname,
                        status: 'ACTIVE',
                    },
                });
                return res.status(200).json(updatedTag);
            }
            return res.status(400).json({ message: 'Tag code already registered' });
        }

        if (!userId) return res.status(401).json({ message: 'Not authenticated' });

        // Phase 1 Rules: domainType is locked at creation
        const selectedDomain: DomainType = domainType || 'CAR';

        let resolvedCompanyId: string;
        if (typeof companyId === 'string' && companyId.trim()) {
            const company = await prisma.company.findUnique({
                where: { id: companyId.trim() },
                select: { id: true }
            });

            if (!company) {
                return res.status(400).json({ message: 'Invalid companyId' });
            }

            resolvedCompanyId = company.id;
        } else {
            const existingCompany = await prisma.company.findFirst({
                select: { id: true },
                orderBy: { createdAt: 'asc' }
            });

            if (existingCompany) {
                resolvedCompanyId = existingCompany.id;
            } else {
                const createdCompany = await prisma.company.create({
                    data: { name: 'Connect360 Default Company' },
                    select: { id: true }
                });
                resolvedCompanyId = createdCompany.id;
            }
        }

        const newTag = await prisma.tag.create({
            data: {
                code,
                nickname,
                userId,
                companyId: resolvedCompanyId,
                domainType: selectedDomain,
                status: 'ACTIVE',
            },
        });

        // Initialize appropriate profile
        if (selectedDomain === 'CAR') await prisma.carProfile.create({ data: { tagId: newTag.id, vehicleNumber: '' } });
        if (selectedDomain === 'KID') await prisma.kidProfile.create({ data: { tagId: newTag.id, displayName: '', primaryGuardian: {} } });
        if (selectedDomain === 'PET') await prisma.petProfile.create({ data: { tagId: newTag.id, petName: '', ownerContact: {} } });

        res.status(201).json(newTag);
    } catch (error) {
        console.error('Create Tag Error:', error);
        res.status(500).json({ message: 'Server error', error });
    }
};

// ... other methods omitted or moved to `managementController.ts` based on Phase 2
export const updateTag = async (req: Request, res: Response) => {
    res.status(400).json({ message: 'Migrated to /v1/tags/:id/configuration' });
};
export const sendTagOtp = async (req: Request, res: Response) => {
    res.status(400).json({ message: 'Not Implemented in V2 API' });
};
export const verifyTagOtpAndUpdate = async (req: Request, res: Response) => {
    res.status(400).json({ message: 'Not Implemented in V2 API' });
};
export const updatePrivacy = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { setting } = req.body;
        // @ts-ignore
        const userId = req.user?.id;

        const tag = await prisma.tag.findUnique({ where: { id, userId } });
        if (!tag) {
            return res.status(404).json({ message: 'Tag not found or unauthorized' });
        }

        // Validate the setting field mapping
        const validSettings: Record<string, boolean> = {
            allowMaskedCall: true,
            allowWhatsapp: true,
            allowSms: true,
            showEmergencyContact: true,
        };

        if (!validSettings[setting]) {
            return res.status(400).json({ message: 'Invalid privacy setting key' });
        }

        // Toggle the field
        // @ts-ignore
        const updatedTag = await prisma.tag.update({
            where: { id },
            data: {
                // @ts-ignore (Boolean toggle on a dynamic key mapping directly to the DB schema)
                [setting]: !tag[setting],
            }
        });

        res.status(200).json({ message: 'Privacy updated successfully', tag: updatedTag });
    } catch (error) {
        console.error('Update Privacy Error:', error);
        res.status(500).json({ message: 'Server error', error });
    }
};

export const getPublicTag = async (req: Request, res: Response) => {
    res.status(400).json({ message: 'Migrated to Phase 2: /api/v1/scan/:tagCode endpoint' });
};

export const activateTag = async (req: Request, res: Response) => {
    res.status(400).json({ message: 'Not Implemented in V2 API' });
};

export const activateTagSendOtp = async (req: Request, res: Response) => {
    try {
        const { code, phoneNumber } = req.body;
        const tagCode = code; // Frontend sends 'code'
        console.log(`🔐 [Activation] Sending OTP for Tag ${tagCode} to ${phoneNumber}`);

        // Mock success for now
        res.status(200).json({ success: true, message: 'OTP sent' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const activateTagVerifyOtp = async (req: Request, res: Response) => {
    try {
        const { code, phoneNumber, otp, plateNumber, identifier } = req.body;
        const tagCode = code; // Frontend sends 'code'
        const tagIdentifier = plateNumber || identifier; // Frontend sends 'plateNumber'

        // Mock OTP verification (123456)
        if (otp !== '123456' && otp !== '111111') {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        const tag = await prisma.tag.findUnique({
            where: { code: tagCode },
            include: { carProfile: true, kidProfile: true, petProfile: true }
        });

        if (!tag) return res.status(404).json({ success: false, message: 'Tag not found' });
        if (tag.status !== 'MINTED') return res.status(400).json({ success: false, message: 'Tag already activated' });

        // 1. Find or Create User
        let user = await prisma.user.findUnique({ where: { phoneNumber } });
        if (!user) {
            user = await prisma.user.create({ data: { phoneNumber } });
        }

        // 2. Update Tag
        const updatedTag = await prisma.tag.update({
            where: { id: tag.id },
            data: {
                userId: user.id,
                status: 'ACTIVE',
                nickname: tagIdentifier // Use identifier as default nickname
            }
        });

        // 3. Initialize/Update Profile based on domain
        if (tag.domainType === 'CAR') {
            await prisma.carProfile.upsert({
                where: { tagId: tag.id },
                create: { tagId: tag.id, vehicleNumber: tagIdentifier },
                update: { vehicleNumber: tagIdentifier }
            });
        } else if (tag.domainType === 'KID') {
            await prisma.kidProfile.upsert({
                where: { tagId: tag.id },
                create: { tagId: tag.id, displayName: tagIdentifier, primaryGuardian: { name: 'Guardian', phone: phoneNumber } },
                update: { displayName: tagIdentifier }
            });
        } else if (tag.domainType === 'PET') {
            await prisma.petProfile.upsert({
                where: { tagId: tag.id },
                create: { tagId: tag.id, petName: tagIdentifier, ownerContact: { name: 'Owner', phone: phoneNumber } },
                update: { petName: tagIdentifier }
            });
        }

        // 4. Generate JWT for the user so they are logged in after activation
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
        const token = jwt.sign(
            { id: user.id, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json({
            success: true,
            message: 'Tag activated successfully',
            tag: updatedTag,
            user,
            token
        });

    } catch (error) {
        console.error('Activation Error:', error);
        res.status(500).json({ success: false, message: 'Activation failed', error });
    }
};
