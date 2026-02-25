import { Request, Response } from 'express';
import { ScanResolverService } from '../services/ScanResolverService';

export const scanTag = async (req: Request, res: Response): Promise<void> => {
    const { tagCode } = req.params;
    try {

        // Gate 1: (Rate limiting handled in middleware prior to this controller)

        // Gate 2 - 5: Resolution, Pipeline, Hydration
        const result = await ScanResolverService.resolveTag(tagCode);

        // Strict Envelope Schema (Phase 2 Rule)
        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        // Map Domain/Backend Errors to Standardized HTTP Responses
        const message = error.message;

        let statusCode = 500;
        let response: any = {
            success: false,
            locked: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred during scan resolution.',
                actionable: false,
            },
        };

        if (message === 'TAG_NOT_FOUND') {
            statusCode = 404;
            response.error.code = 'NOT_FOUND';
            response.error.message = 'This tag is not registered or does not exist.';
        } else if (message === 'TAG_NOT_ACTIVE' || message === 'TAG_SUSPENDED') {
            statusCode = 403;
            response.locked = true;
            response.error.code = 'LOCKED';
            response.error.message = 'This tag has not been activated yet or is suspended.';
        } else if (message.includes('PROFILE_MISSING')) {
            // Data inconsistency or brand new tag scanned
            statusCode = 200;

            // Try to get metadata for the theme (resolveTag returns metadata even if status != ACTIVE)
            // But here we are in catch because resolveTag threw PROFILE_MISSING at Gate 4.
            // We can't easily get the partial metadata from the thrown error unless we refactor the service.
            // However, we can at least return the tagCode.

            response = {
                success: true,
                status: 'PROFILE_INCOMPLETE', // Standardized Status
                locked: false,
                metadata: {
                    tagCode,
                    domainType: message.startsWith('CAR') ? 'CAR' : message.startsWith('KID') ? 'KID' : message.startsWith('PET') ? 'PET' : 'CAR',
                    status: 'MINTED'
                },
                data: null
            };
        }

        res.status(statusCode).json(response);
    }
};
