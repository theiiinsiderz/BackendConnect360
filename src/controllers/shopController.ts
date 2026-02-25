import { Request, Response } from 'express';
import prisma from '../prisma';

// Mock Products for Demo
const MOCK_PRODUCTS = [
    {
        name: 'Premium Metal Tag',
        description: 'Durable, waterproof, and stylish NFC tag for your car.',
        price: 499,
        imageUrl: 'https://via.placeholder.com/150',
        category: 'car',
        features: ['NFC Enabled', 'QR Code', 'Waterproof'],
        stock: 100,
        isActive: true,
    },
    {
        name: 'Bike Sticker Pack',
        description: 'High-visibility QR stickers for bikes and helmets.',
        price: 199,
        imageUrl: 'https://via.placeholder.com/150',
        category: 'bike',
        features: ['Reflective', 'QR Code', 'Weather Resistant'],
        stock: 200,
        isActive: true,
    },
    {
        name: 'Business Card Tag',
        description: 'Share your contact info with a tap.',
        price: 299,
        imageUrl: 'https://via.placeholder.com/150',
        category: 'business',
        features: ['NFC Enabled', 'Customizable'],
        stock: 50,
        isActive: true,
    },
];

export const getProducts = async (req: Request, res: Response) => {
    try {
        // Check if products exist, if not seed them
        const count = await prisma.product.count();
        if (count === 0) {
            await prisma.product.createMany({
                data: MOCK_PRODUCTS
            });
        }

        const products = await prisma.product.findMany({
            where: { isActive: true }
        });
        res.json(products);
    } catch (error) {
        console.error('Get Products Error:', error);
        res.status(500).json({ message: 'Server error', error });
    }
};

export const createOrder = async (req: Request, res: Response) => {
    try {
        const { items, totalAmount } = req.body;
        // Mock order creation logic
        // In real app: Validate stock, create Payment Intent (Razorpay/Stripe), save Order

        res.status(201).json({
            message: 'Order created successfully',
            orderId: 'ORDER-' + Math.floor(Math.random() * 10000)
        });
    } catch (error) {
        console.error('Create Order Error:', error);
        res.status(500).json({ message: 'Server error', error });
    }
};
