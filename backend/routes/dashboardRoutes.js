import express from 'express';
import { 
    getDashboardStats, 
    getOrderStats,
    getOrderItemStats,
    getMonthlySalesData,
    getTechnicianDashboardStats,
    getExecutiveDashboardStats
} from '../controllers/dashboardController.js';
import { verifyToken } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/counts', getDashboardStats); 
router.get('/stats', getOrderStats);
router.get('/order-items', getOrderItemStats);
router.get('/monthly-sales', getMonthlySalesData);
router.get('/technician-stats', verifyToken, getTechnicianDashboardStats);
router.get('/executive-stats', verifyToken, getExecutiveDashboardStats);

export default router;
