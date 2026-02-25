import { DomainType, Tag as ITag, PrismaClient, TagStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Defined shape of the Phase 2 API contract to be shaped by Phase 1 backend rules
export interface ScanResult {
    metadata: {
        tagCode: string;
        domainType: DomainType;
        status: TagStatus;
    };
    payload?: any;
}

export class ScanResolverService {
    /**
     * Core Engine Gate: Look up the tag and validate its physical status
     */
    static async resolveTag(tagCode: string): Promise<ScanResult> {
        const tag = await prisma.tag.findUnique({
            where: { code: tagCode }
        });

        if (!tag) {
            throw new Error('TAG_NOT_FOUND');
        }

        const metadata = {
            tagCode: tag.code,
            domainType: tag.domainType,
            status: tag.status,
        };

        // If the tag is not ready/active, we don't fetch the domain payload to save DB cycles
        if (tag.status !== TagStatus.ACTIVE) {
            return { metadata };
        }

        // Gate 3: Domain Delegation
        const payload = await this.delegateToDomain(tag);

        return {
            metadata,
            payload,
        };
    }

    /**
     * Domain Delegation: Hard switch enforcing schema isolation
     */
    private static async delegateToDomain(tag: ITag) {
        switch (tag.domainType) {
            case DomainType.CAR:
                return this.resolveCar(tag);
            case DomainType.KID:
                return this.resolveKid(tag);
            case DomainType.PET:
                return this.resolvePet(tag);
            default:
                throw new Error(`UNKNOWN_DOMAIN_TYPE: ${tag.domainType}`);
        }
    }

    /**
     * Gate 4: Privacy & Hydration for Cars
     */
    private static async resolveCar(tag: ITag) {
        const profile = await prisma.carProfile.findUnique({ where: { tagId: tag.id } });
        if (!profile) throw new Error('CAR_PROFILE_MISSING');

        // MASK DATA BEFORE RETURNING (Phase 1 Security rules)
        const maskedPlate = profile.plateNumber.replace(/.(?=.{4})/g, '*');

        const actions = [];
        if (tag.allowMaskedCall) {
            actions.push({ actionType: 'MASKED_CALL_OWNER' });
        }
        if (tag.allowWhatsapp) {
            actions.push({ actionType: 'WHATSAPP_OWNER' });
        }
        if (tag.allowSms) {
            actions.push({ actionType: 'SMS_OWNER' });
        }
        actions.push({ actionType: 'REPORT_PARKING_ISSUE' });

        return {
            vehicleType: profile.vehicleType,
            registrationMasked: maskedPlate,
            actionsAvailable: actions
        };
    }

    /**
     * Gate 4: Privacy & Hydration for Kids
     */
    private static async resolveKid(tag: ITag) {
        const profile = await prisma.kidProfile.findUnique({ where: { tagId: tag.id } });
        if (!profile) throw new Error('KID_PROFILE_MISSING');

        const actions = [];
        if (tag.allowMaskedCall) {
            actions.push({
                actionType: 'CALL_PRIMARY_GUARDIAN',
                requiresLocationShare: profile.requireLocationShare
            });
        }
        if (tag.allowWhatsapp) {
            actions.push({ actionType: 'WHATSAPP_OWNER' });
        }
        if (tag.allowSms) {
            actions.push({ actionType: 'SMS_OWNER' });
        }

        return {
            displayName: profile.displayName,
            medicalAlerts: profile.medicalAlerts,
            actionsAvailable: actions
        };
    }

    /**
     * Gate 4: Privacy & Hydration for Pets
     */
    private static async resolvePet(tag: ITag) {
        const profile = await prisma.petProfile.findUnique({ where: { tagId: tag.id } });
        if (!profile) throw new Error('PET_PROFILE_MISSING');

        const actions = [];
        if (tag.allowMaskedCall) {
            actions.push({ actionType: 'MASKED_CALL_OWNER' });
        }
        if (tag.allowWhatsapp) {
            actions.push({ actionType: 'WHATSAPP_OWNER' });
        }
        if (tag.allowSms) {
            actions.push({ actionType: 'SMS_OWNER' });
        }

        return {
            petName: profile.petName,
            breedInfo: profile.breedInfo,
            actionsAvailable: actions
        };
    }
}
