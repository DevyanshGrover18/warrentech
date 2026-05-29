import express from 'express';
import { getProducts, getProductBySerialNumber, deleteProduct, updateProduct } from '../controllers/productController.js';
import { verifyToken, checkSectionAccess, checkPermission, checkAnySectionAccess } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/', verifyToken, checkAnySectionAccess(['products', 'sales']), getProducts);
router.put('/:id', verifyToken, checkPermission('products', 'modify'), updateProduct);
router.delete('/:id', verifyToken, checkPermission('products', 'delete'), deleteProduct);
router.get('/serial/:serialNumber', getProductBySerialNumber);

export default router;
