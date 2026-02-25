import { Request, Response } from 'express';
import prisma from '../prisma';

export const executeAction = async (req: Request, res: Response): Promise<void> => {
    try {
        const { tagCode } = req.params;
        const { actionType, scannerPhone, location } = req.body;

        const tag = await prisma.tag.findUnique({ 
            where: { code: tagCode },
            include: {
                carProfile: true,
                kidProfile: true,
                petProfile: true,
                user: true
            }
        });

        if (!tag) {
            res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tag not found' } });
            return;
        }

        let responseData = {};

        // Domain Gate: Verify the action is valid for the domain
        switch (tag.domainType) {
            case 'CAR':
                if (!['MASKED_CALL_OWNER', 'REPORT_PARKING_ISSUE', 'WHATSAPP_OWNER', 'SMS_OWNER'].includes(actionType)) {
                    throw new Error('INVALID_ACTION_FOR_DOMAIN');
                }
                
                if (actionType === 'MASKED_CALL_OWNER' && tag.allowMaskedCall) {
                    // Return the owner's phone number for masked calling
                    responseData = { 
                        status: 'INITIATED', 
                        bridgeNumber: tag.user?.phoneNumber || '+18005550299',
                        message: 'Connecting you to the vehicle owner...'
                    };
                } else if (actionType === 'WHATSAPP_OWNER' && tag.allowWhatsapp) {
                    responseData = { 
                        status: 'INITIATED',
                        whatsappNumber: tag.user?.phoneNumber,
                        message: 'Opening WhatsApp...'
                    };
                } else if (actionType === 'SMS_OWNER' && tag.allowSms) {
                    responseData = { 
                        status: 'INITIATED',
                        smsNumber: tag.user?.phoneNumber,
                        message: 'Opening SMS...'
                    };
                } else if (actionType === 'REPORT_PARKING_ISSUE') {
                    responseData = { 
                        status: 'REPORTED',
                        message: 'Parking issue reported to owner'
                    };
                } else {
                    throw new Error('ACTION_NOT_ENABLED');
                }
                break;

            case 'KID':
                if (!['CALL_PRIMARY_GUARDIAN', 'WHATSAPP_OWNER', 'SMS_OWNER'].includes(actionType)) {
                    throw new Error('INVALID_ACTION_FOR_DOMAIN');
                }

                // Strict Privacy Enforcement (Phase 1)
                if (tag.kidProfile?.requireLocationShare && !location) {
                    res.status(400).json({ 
                        success: false, 
                        error: { 
                            code: 'LOCATION_REQUIRED', 
                            message: 'You must share your location to contact the guardian.' 
                        } 
                    });
                    return;
                }

                if (actionType === 'CALL_PRIMARY_GUARDIAN' && tag.allowMaskedCall) {
                    responseData = { 
                        status: 'INITIATED', 
                        bridgeNumber: tag.user?.phoneNumber || '+18005550299',
                        message: 'Connecting you to the guardian...'
                    };
                } else if (actionType === 'WHATSAPP_OWNER' && tag.allowWhatsapp) {
                    responseData = { 
                        status: 'INITIATED',
                        whatsappNumber: tag.user?.phoneNumber,
                        message: 'Opening WhatsApp...'
                    };
                } else if (actionType === 'SMS_OWNER' && tag.allowSms) {
                    responseData = { 
                        status: 'INITIATED',
                        smsNumber: tag.user?.phoneNumber,
                        message: 'Opening SMS...'
                    };
                } else {
                    throw new Error('ACTION_NOT_ENABLED');
                }
                break;

            case 'PET':
                if (!['MASKED_CALL_OWNER', 'WHATSAPP_OWNER', 'SMS_OWNER'].includes(actionType)) {
                    throw new Error('INVALID_ACTION_FOR_DOMAIN');
                }
                
                if (actionType === 'MASKED_CALL_OWNER' && tag.allowMaskedCall) {
                    responseData = { 
                        status: 'INITIATED', 
                        bridgeNumber: tag.user?.phoneNumber || '+18005550299',
                        message: 'Connecting you to the pet owner...'
                    };
                } else if (actionType === 'WHATSAPP_OWNER' && tag.allowWhatsapp) {
                    responseData = { 
                        status: 'INITIATED',
                        whatsappNumber: tag.user?.phoneNumber,
                        message: 'Opening WhatsApp...'
                    };
                } else if (actionType === 'SMS_OWNER' && tag.allowSms) {
                    responseData = { 
                        status: 'INITIATED',
                        smsNumber: tag.user?.phoneNumber,
                        message: 'Opening SMS...'
                    };
                } else {
                    throw new Error('ACTION_NOT_ENABLED');
                }
                break;

            default:
                throw new Error('UNKNOWN_DOMAIN_TYPE');
        }

        res.status(200).json({
            success: true,
            data: responseData,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: { code: 'ACTION_FAILED', message: error.message },
        });
    }
};
