import express from 'express';
import { createSale, getSalesByDealer, updateSale, getAssignedProducts, getDealerSales, getSalesByCustomer, getAllSales } from '../controllers/saleController.js';
import { verifyToken } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/all', verifyToken, getAllSales);
router.get('/dealer-sales', verifyToken, getDealerSales);
router.post('/', verifyToken, createSale);
router.get('/customer', verifyToken, getSalesByCustomer);
router.get('/dealer/:dealerId', verifyToken, getSalesByDealer);
router.get('/assigned-products', verifyToken, getAssignedProducts);
router.put('/:saleId', verifyToken, updateSale);

export default router;
