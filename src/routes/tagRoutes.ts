import express from 'express';
import {
    activateTag,
    activateTagSendOtp,
    activateTagVerifyOtp,
    createTag,
    getPublicTag,
    getTags,
    sendTagOtp,
    updatePrivacy,
    updateTag,
    verifyTagOtpAndUpdate
} from '../controllers/tagController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// Authenticated routes
router.get('/', authenticateToken, getTags);
router.post('/', authenticateToken, createTag);
router.post('/activate', authenticateToken, activateTag);
router.put('/:id', authenticateToken, updateTag);
router.patch('/:id/privacy', authenticateToken, updatePrivacy);
router.post('/:id/otp/send', authenticateToken, sendTagOtp);
router.post('/:id/otp/verify', authenticateToken, verifyTagOtpAndUpdate);

// Public routes (scanned by anyone)
router.get('/public/:id', getPublicTag);
router.post('/activate/send-otp', activateTagSendOtp);
router.post('/activate/verify-otp', activateTagVerifyOtp);

export default router;
