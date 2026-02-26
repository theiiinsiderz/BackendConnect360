import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // in prod use env
const ADMIN_ROLE_CACHE_TTL_MS = 60_000;
const adminRoleCache = new Map<string, { isAdmin: boolean; expiresAt: number }>();

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

export const authorizeAdmin = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const cacheKey = req.user.id as string;
        const now = Date.now();
        const cached = adminRoleCache.get(cacheKey);

        if (cached && cached.expiresAt > now) {
            if (cached.isAdmin) {
                next();
            } else {
                res.status(403).json({ message: 'Admin access required' });
            }
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { role: true }
        });

        const isAdmin = !!user && user.role === 'ADMIN';
        adminRoleCache.set(cacheKey, {
            isAdmin,
            expiresAt: now + ADMIN_ROLE_CACHE_TTL_MS
        });

        if (isAdmin) {
            next();
        } else {
            res.status(403).json({ message: 'Admin access required' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error check admin role' });
    }
};
