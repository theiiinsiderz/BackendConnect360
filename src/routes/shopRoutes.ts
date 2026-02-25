import express from 'express';
import { createOrder, getProducts } from '../controllers/shopController';

const router = express.Router();

router.get('/products', getProducts);
router.post('/orders', createOrder);

export default router;
