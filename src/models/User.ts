import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    phoneNumber: string;
    name?: string;
    email?: string;
    avatar?: string;
    role: 'user' | 'admin';
    createdAt: Date;
}

const UserSchema: Schema = new Schema({
    phoneNumber: { type: String, required: true, unique: true },
    name: { type: String },
    email: { type: String },
    avatar: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
