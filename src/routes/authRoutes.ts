import express from 'express';
import { adminLogin, sendOtp, verifyOtp } from '../controllers/authController';

const router = express.Router();

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/admin-login', adminLogin);

export default router;
