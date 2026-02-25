import { Router } from 'express';
import prisma from '../prisma';
import { NotificationService } from '../services/notificationService';

const router = Router();

// Register/Update device token
router.post('/register-token', async (req, res) => {
    const { ownerId, pushToken } = req.body;

    if (!ownerId || !pushToken) {
        return res.status(400).json({ error: 'ownerId and pushToken are required' });
    }

    try {
        const token = await prisma.deviceToken.upsert({
            where: { ownerId },
            update: { pushToken },
            create: { ownerId, pushToken },
        });
        res.json(token);
    } catch (error) {
        console.error('Error registering token:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Send message
router.post('/message', async (req, res) => {
    const { ownerId, senderName, message } = req.body;

    if (!ownerId || !senderName || !message) {
        return res.status(400).json({ error: 'ownerId, senderName, and message are required' });
    }

    try {
        // 1. Save message to DB
        const newMessage = await prisma.message.create({
            data: {
                ownerId,
                senderName,
                message,
            },
        });

        // 2. Lookup push token
        const deviceToken = await prisma.deviceToken.findUnique({
            where: { ownerId },
        });

        // 3. Send push notification if token exists
        if (deviceToken) {
            await NotificationService.sendPushNotification(
                deviceToken.pushToken,
                `New Message from ${senderName}`,
                message,
                { messageId: newMessage.id }
            );
        }

        res.json({ success: true, message: newMessage });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get messages for owner
router.get('/messages/:ownerId', async (req, res) => {
    const { ownerId } = req.params;

    try {
        const messages = await prisma.message.findMany({
            where: { ownerId },
            orderBy: { createdAt: 'desc' },
        });
        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
