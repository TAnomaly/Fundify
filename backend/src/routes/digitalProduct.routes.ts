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
    getProductMeta,
    getProductCollections,
} from '../controllers/digitalProductController';

const router = Router();

// Public endpoints
router.get('/products', getAllProducts as any);
// This route must come before /products/:id to avoid "me" being treated as an ID
router.get('/products/me', authenticate as any, getCreatorProducts as any);
router.get('/products/meta', getProductMeta as any);
router.get('/products/collections', getProductCollections as any);

router.get('/products/:id', getProductById as any);
router.post('/products', authenticate as any, createProduct as any);
router.put('/products/:id', authenticate as any, updateProduct as any);
router.delete('/products/:id', authenticate as any, deleteProduct as any);

router.post('/products/:id/purchase', authenticate as any, purchaseProduct as any);
router.get('/purchases/me', authenticate as any, getMyPurchases as any);
router.get('/products/:id/download', authenticate as any, downloadProduct as any);

export default router;
