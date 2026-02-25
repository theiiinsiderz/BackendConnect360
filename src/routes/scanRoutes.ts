import express from 'express';
import { executeAction } from '../controllers/actionController';
import { scanTag } from '../controllers/scanController';

const router = express.Router();

// Public Scan Endpoint (Phase 2)
// Uses token bucket rate limiting middleware in a prod environment
router.get('/v1/scan/:tagCode', scanTag);

// Execution Endpoint (Phase 2)
router.post('/v1/scan/:tagCode/action', executeAction);

export default router;
