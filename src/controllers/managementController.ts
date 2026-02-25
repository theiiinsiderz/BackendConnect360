import { Request, Response } from 'express';
import CarProfile from '../models/CarProfile';
import KidProfile from '../models/KidProfile';
import PetProfile from '../models/PetProfile';
import Tag, { ITag } from '../models/Tag';

// Note: In an actual app, req.user would be populated by an auth middleware
export const updateTagConfiguration = async (req: Request, res: Response): Promise<void> => {
    try {
        const { tagId } = req.params;
        const updates = req.body;

        // Mocking user ID for Phase 2 demonstration 
        const userId = req.user?.id || 'mock_owner_id';

        const tag = await Tag.findById(tagId).lean<ITag>();

        if (!tag || tag.ownerId?.toString() !== userId) {
            res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized to manage this tag.' } });
            return;
        }

        // Domain Rule Enforcement: We cannot update the base tag domainType.
        // We delegate the update strictly to the corresponding polymorphic table.
        let updatedProfile;

        switch (tag.domainType) {
            case 'CAR':
                updatedProfile = await CarProfile.findOneAndUpdate(
                    { tagId: tag._id },
                    { $set: updates },
                    { new: true, runValidators: true }
                );
                break;
            case 'KID':
                updatedProfile = await KidProfile.findOneAndUpdate(
                    { tagId: tag._id },
                    { $set: updates },
                    { new: true, runValidators: true }
                );
                break;
            case 'PET':
                updatedProfile = await PetProfile.findOneAndUpdate(
                    { tagId: tag._id },
                    { $set: updates },
                    { new: true, runValidators: true }
                );
                break;
            default:
                throw new Error('UNKNOWN_DOMAIN_TYPE');
        }

        res.status(200).json({
            success: true,
            data: updatedProfile
        });

    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: { code: 'UPDATE_FAILED', message: error.message }
        });
    }
};

export const updateTagStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { tagId } = req.params;
        const { status } = req.body;
        const userId = req.user?.id || 'mock_owner_id';

        // Prevent arbitrary states
        if (!['ACTIVE', 'SUSPENDED', 'REVOKED'].includes(status)) {
            res.status(400).json({ success: false, error: { code: 'INVALID_STATUS' } });
            return;
        }

        const tag = await Tag.findOneAndUpdate(
            { _id: tagId, ownerId: userId },
            { $set: { status } },
            { new: true }
        );

        if (!tag) {
            res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
            return;
        }

        res.status(200).json({ success: true, data: { status: tag.status } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
};
