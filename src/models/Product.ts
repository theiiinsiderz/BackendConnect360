import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    category: 'car' | 'bike' | 'business' | 'bundle';
    features: string[];
    stock: number;
    isActive: boolean;
}

const ProductSchema: Schema = new Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    imageUrl: { type: String, required: true },
    category: { type: String, enum: ['car', 'bike', 'business', 'bundle'], default: 'car' },
    features: [{ type: String }],
    stock: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<IProduct>('Product', ProductSchema);
