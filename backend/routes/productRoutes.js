import express from 'express';
import { getProducts, getProductBySerialNumber, deleteProduct, updateProduct } from '../controllers/productController.js';
import { verifyToken, checkSectionAccess, checkPermission } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/', verifyToken, checkSectionAccess('products'), getProducts);
router.put('/:id', verifyToken, checkPermission('products', 'modify'), updateProduct);
router.delete('/:id', verifyToken, checkPermission('products', 'delete'), deleteProduct);
router.get('/serial/:serialNumber', getProductBySerialNumber);

export default router;
