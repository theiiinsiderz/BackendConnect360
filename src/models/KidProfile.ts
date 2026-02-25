import mongoose, { Document, Schema } from 'mongoose';

export interface IKidConfiguration extends Document {
    tagId: mongoose.Types.ObjectId; // Ref to Tag
    displayName: string; // Nickname only
    primaryGuardian: {
        relationship: string;
        phone: string;
    };
    medicalAlerts?: string;
    requireLocationShare: boolean; // Must share GPS to see phone number
}

const KidConfigurationSchema = new Schema(
    {
        tagId: { type: Schema.Types.ObjectId, ref: 'Tag', required: true, unique: true },
        displayName: { type: String, required: true, maxlength: 20 },
        primaryGuardian: {
            relationship: { type: String, required: true },
            phone: { type: String, required: true },
        },
        medicalAlerts: { type: String },
        requireLocationShare: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export default mongoose.models.KidConfiguration || mongoose.model<IKidConfiguration>('KidConfiguration', KidConfigurationSchema);
