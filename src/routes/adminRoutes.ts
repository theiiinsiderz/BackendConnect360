import express from 'express';
import { generateBatch } from '../controllers/adminController';
import { authenticateToken, authorizeAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// Protected Route: Only Admin can generate batch tags
router.post('/generate', authenticateToken, authorizeAdmin, generateBatch);

export default router;
