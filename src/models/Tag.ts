import mongoose, { Document, Schema } from 'mongoose';

export enum DomainType {
    CAR = 'CAR',
    KID = 'KID',
    PET = 'PET',
}

export enum TagStatus {
    MINTED = 'MINTED',
    UNCLAIMED = 'UNCLAIMED',
    ACTIVE = 'ACTIVE',
    SUSPENDED = 'SUSPENDED',
    REVOKED = 'REVOKED',
}

export interface ITag extends Document {
    tagId: string; // The short NanoID printed on the QR
    domainType: DomainType; // Immutable after minting
    status: TagStatus;
    version: number;
    ownerId?: mongoose.Types.ObjectId; // Nullable until claimed
    createdAt: Date;
    updatedAt: Date;
}

const TagSchema: Schema = new Schema(
    {
        tagId: { type: String, required: true, unique: true, index: true },
        domainType: {
            type: String,
            enum: Object.values(DomainType),
            required: true,
            // Prevents domainType change after creation (Immutability rule)
            set: function (this: any, val: string) {
                if (this.isNew || !this.domainType) return val;
                throw new Error('domainType is immutable');
            },
        },
        status: {
            type: String,
            enum: Object.values(TagStatus),
            default: TagStatus.MINTED,
            required: true,
        },
        version: { type: Number, default: 1 },
        ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

// Prevent mutating the domainType directly
TagSchema.pre('save', function (next) {
    if (this.isModified('domainType') && !this.isNew) {
        next(new Error('domainType is immutable'));
    } else {
        next();
    }
});

export default mongoose.models.Tag || mongoose.model<ITag>('Tag', TagSchema);
