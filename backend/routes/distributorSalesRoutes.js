import express from 'express';
import { getDealerSales, getCustomerSales, sellToCustomer } from '../controllers/distributorSalesController.js';
import { verifyToken } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/dealer-sales/:distributorId', verifyToken, getDealerSales);
router.get('/customer-sales/:distributorId', verifyToken, getCustomerSales);
router.post('/sell-to-customer', verifyToken, sellToCustomer);

export default router;
