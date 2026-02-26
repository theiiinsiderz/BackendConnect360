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

        const existingTag = await prisma.tag.findUnique({
            where: { code },
            select: { id: true, userId: true, status: true }
        });
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

        const newTag = await prisma.$transaction(async (tx) => {
            let resolvedCompanyId: string;

            if (typeof companyId === 'string' && companyId.trim()) {
                const company = await tx.company.findUnique({
                    where: { id: companyId.trim() },
                    select: { id: true }
                });

                if (!company) {
                    throw new Error('INVALID_COMPANY_ID');
                }

                resolvedCompanyId = company.id;
            } else {
                const existingCompany = await tx.company.findFirst({
                    select: { id: true },
                    orderBy: { createdAt: 'asc' }
                });

                if (existingCompany) {
                    resolvedCompanyId = existingCompany.id;
                } else {
                    const createdCompany = await tx.company.create({
                        data: { name: 'Connect360 Default Company' },
                        select: { id: true }
                    });
                    resolvedCompanyId = createdCompany.id;
                }
            }

            const profileCreate: any = {};
            if (selectedDomain === 'CAR') profileCreate.carProfile = { create: { vehicleNumber: '' } };
            if (selectedDomain === 'KID') profileCreate.kidProfile = { create: { displayName: '', primaryGuardian: {} } };
            if (selectedDomain === 'PET') profileCreate.petProfile = { create: { petName: '', ownerContact: {} } };

            return tx.tag.create({
                data: {
                    code,
                    nickname,
                    userId,
                    companyId: resolvedCompanyId,
                    domainType: selectedDomain,
                    status: 'ACTIVE',
                    ...profileCreate
                },
            });
        });

        res.status(201).json(newTag);
    } catch (error) {
        if (error instanceof Error && error.message === 'INVALID_COMPANY_ID') {
            return res.status(400).json({ message: 'Invalid companyId' });
        }
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

        // Validate and whitelist toggle field
        const validSettings: Record<string, string> = {
            allowMaskedCall: '"allowMaskedCall"',
            allowWhatsapp: '"allowWhatsapp"',
            allowSms: '"allowSms"',
            showEmergencyContact: '"showEmergencyContact"',
        };

        const selectedColumn = validSettings[setting];
        if (!selectedColumn) {
            return res.status(400).json({ message: 'Invalid privacy setting key' });
        }

        const updatedRows = await prisma.$queryRawUnsafe<any[]>(
            `UPDATE "Tag"
             SET ${selectedColumn} = NOT ${selectedColumn},
                 "updatedAt" = NOW()
             WHERE "id" = $1 AND "userId" = $2
             RETURNING *`,
            id,
            userId
        );

        const updatedTag = updatedRows[0];
        if (!updatedTag) {
            return res.status(404).json({ message: 'Tag not found or unauthorized' });
        }

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
            select: {
                id: true,
                domainType: true,
                status: true
            }
        });

        if (!tag) return res.status(404).json({ success: false, message: 'Tag not found' });
        if (tag.status !== 'MINTED') return res.status(400).json({ success: false, message: 'Tag already activated' });

        const { user, updatedTag } = await prisma.$transaction(async (tx) => {
            // 1. Find or Create User
            const resolvedUser = await tx.user.upsert({
                where: { phoneNumber },
                update: {},
                create: { phoneNumber }
            });

            // 2. Update Tag
            const resolvedTag = await tx.tag.update({
                where: { id: tag.id },
                data: {
                    userId: resolvedUser.id,
                    status: 'ACTIVE',
                    nickname: tagIdentifier // Use identifier as default nickname
                }
            });

            // 3. Initialize/Update Profile based on domain
            if (tag.domainType === 'CAR') {
                await tx.carProfile.upsert({
                    where: { tagId: tag.id },
                    create: { tagId: tag.id, vehicleNumber: tagIdentifier },
                    update: { vehicleNumber: tagIdentifier }
                });
            } else if (tag.domainType === 'KID') {
                await tx.kidProfile.upsert({
                    where: { tagId: tag.id },
                    create: { tagId: tag.id, displayName: tagIdentifier, primaryGuardian: { name: 'Guardian', phone: phoneNumber } },
                    update: { displayName: tagIdentifier }
                });
            } else if (tag.domainType === 'PET') {
                await tx.petProfile.upsert({
                    where: { tagId: tag.id },
                    create: { tagId: tag.id, petName: tagIdentifier, ownerContact: { name: 'Owner', phone: phoneNumber } },
                    update: { petName: tagIdentifier }
                });
            }

            return {
                user: resolvedUser,
                updatedTag: resolvedTag
            };
        });

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
