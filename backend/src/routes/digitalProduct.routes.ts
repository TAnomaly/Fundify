import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    getAllProducts,
    getProductById,
    getCreatorProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    purchaseProduct,
    getMyPurchases,
    downloadProduct,
} from '../controllers/digitalProductController';

const router = Router();

// Public endpoints
router.get('/products', getAllProducts as any);
router.get('/products/:id', getProductById as any);

// Authenticated user endpoints
router.get('/products/me', authenticate as any, getCreatorProducts as any);
router.post('/products', authenticate as any, createProduct as any);
router.put('/products/:id', authenticate as any, updateProduct as any);
router.delete('/products/:id', authenticate as any, deleteProduct as any);

router.post('/products/:id/purchase', authenticate as any, purchaseProduct as any);
router.get('/purchases/me', authenticate as any, getMyPurchases as any);
router.get('/products/:id/download', authenticate as any, downloadProduct as any);

export default router;
