import mongoose, { Document, Schema } from 'mongoose';

export interface ICarConfiguration extends Document {
    tagId: mongoose.Types.ObjectId; // Ref to Tag
    vehicleType: string;
    plateNumber: string; // Store hashed/encrypted in production
    emergencyContacts: {
        relationship: string;
        phone: string;
    }[];
    allowPoliceDispatch: boolean;
}

const CarConfigurationSchema = new Schema(
    {
        tagId: { type: Schema.Types.ObjectId, ref: 'Tag', required: true, unique: true },
        vehicleType: { type: String, enum: ['car', 'motorcycle', 'truck', 'other'], required: true },
        plateNumber: { type: String, required: true },
        emergencyContacts: [
            {
                relationship: String,
                phone: String,
            },
        ],
        allowPoliceDispatch: { type: Boolean, default: false },
    },
    { timestamps: true }
);

export default mongoose.models.CarConfiguration || mongoose.model<ICarConfiguration>('CarConfiguration', CarConfigurationSchema);
