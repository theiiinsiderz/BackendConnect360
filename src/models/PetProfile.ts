import mongoose, { Document, Schema } from 'mongoose';

export interface IPetConfiguration extends Document {
    tagId: mongoose.Types.ObjectId; // Ref to Tag
    petName: string;
    breedInfo?: string;
    vetContact?: {
        clinicName: string;
        phone: string;
    };
    ownerContact: {
        relationship: string;
        phone: string;
    };
}

const PetConfigurationSchema = new Schema(
    {
        tagId: { type: Schema.Types.ObjectId, ref: 'Tag', required: true, unique: true },
        petName: { type: String, required: true },
        breedInfo: { type: String },
        vetContact: {
            clinicName: String,
            phone: String,
        },
        ownerContact: {
            relationship: { type: String, required: true },
            phone: { type: String, required: true },
        },
    },
    { timestamps: true }
);

export default mongoose.models.PetConfiguration || mongoose.model<IPetConfiguration>('PetConfiguration', PetConfigurationSchema);
