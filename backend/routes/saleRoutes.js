import express from 'express';
import { createSale, getSalesByDealer, getSalesBySubDealer, updateSale, getAssignedProducts, getDealerSales, getSalesByCustomer, getAllSales } from '../controllers/saleController.js';
import { verifyToken, checkSectionAccess } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/all', verifyToken, checkSectionAccess('sales'), getAllSales);
router.get('/dealer-sales', verifyToken, checkSectionAccess('sales'), getDealerSales);
router.post('/', verifyToken, checkSectionAccess('sales'), createSale);
router.get('/customer', verifyToken, getSalesByCustomer);
router.get('/dealer/:dealerId', verifyToken, checkSectionAccess('sales'), getSalesByDealer);
router.get('/sub-dealer/:subDealerId', verifyToken, checkSectionAccess('sales'), getSalesBySubDealer);
router.get('/assigned-products', verifyToken, checkSectionAccess('sales'), getAssignedProducts);
router.put('/:saleId', verifyToken, checkSectionAccess('sales'), updateSale);

export default router;
