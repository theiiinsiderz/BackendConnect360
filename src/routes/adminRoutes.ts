import express from 'express';
import type { RequestHandler } from 'express';
import { addAdmin, generateBatch } from '../controllers/adminController';
import { createVendor, deleteVendor, listVendors, updateVendor } from '../controllers/vendorController';
import { authenticateToken, authorizeAdmin } from '../middleware/authMiddleware';
import { upload } from '../middleware/upload';

const router = express.Router();
const vendorUploadMiddleware = upload.fields([
	{ name: 'logo', maxCount: 1 },
	{ name: 'qrDesign', maxCount: 1 }
]) as unknown as RequestHandler;

// Protected Route: Only Admin can generate batch tags
router.post('/generate', authenticateToken, authorizeAdmin, generateBatch);
router.post('/add-admin', authenticateToken, authorizeAdmin, addAdmin);
router.get('/vendors', authenticateToken, authorizeAdmin, listVendors);
router.post('/vendors', authenticateToken, authorizeAdmin, vendorUploadMiddleware, createVendor);
router.put('/vendors/:id', authenticateToken, authorizeAdmin, vendorUploadMiddleware, updateVendor);
router.delete('/vendors/:id', authenticateToken, authorizeAdmin, deleteVendor);

export default router;
