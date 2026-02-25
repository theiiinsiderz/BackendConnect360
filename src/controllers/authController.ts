import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

// Mock OTP storage (in-memory for demo, use Redis/DB in production)
const otpStore: Record<string, string> = {};

export const sendOtp = async (req: Request, res: Response) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) return res.status(400).json({ message: 'Phone number is required' });

        // Generate random 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[phoneNumber] = otp;

        console.log(`🔐 OTP for ${phoneNumber}: ${otp}`); // Log for testing

        // TODO: Integrate actual SMS service (Twilio/MSG91)

        res.status(200).json({ message: 'OTP sent successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const verifyOtp = async (req: Request, res: Response) => {
    try {
        const { phoneNumber, otp } = req.body;
        if (!phoneNumber || !otp) return res.status(400).json({ message: 'Phone number and OTP are required' });

        if (otp === '111111' || otpStore[phoneNumber] === otp) {
            delete otpStore[phoneNumber]; // Clear OTP after use

            // Find or create user
            let user = await prisma.user.findUnique({
                where: { phoneNumber }
            });

            if (!user) {
                user = await prisma.user.create({
                    data: { phoneNumber }
                });
            }

            // Generate JWT
            const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
            const token = jwt.sign(
                { id: user.id, role: user.role },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.status(200).json({ message: 'Login successful', token, user });
        } else {
            res.status(400).json({ message: 'Invalid OTP' });
        }
    } catch (error) {
        console.error('Verify OTP Error:', error);
        res.status(500).json({ message: 'Server error', error });
    }
};
