import express from 'express';
import { 
    getDashboardStats, 
    getOrderStats,
    getOrderItemStats,
    getMonthlySalesData,
    getTechnicianDashboardStats,
    getExecutiveDashboardStats
} from '../controllers/dashboardController.js';
import { verifyToken, checkSectionAccess, checkAnySectionAccess } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/counts', verifyToken, checkAnySectionAccess(['management', 'factories', 'orders', 'dealers', 'distributors', 'sales']), getDashboardStats); 
router.get('/stats', verifyToken, checkAnySectionAccess(['orders']), getOrderStats);
router.get('/order-items', verifyToken, checkAnySectionAccess(['orders']), getOrderItemStats);
router.get('/monthly-sales', verifyToken, checkAnySectionAccess(['sales']), getMonthlySalesData);
router.get('/technician-stats', verifyToken, checkAnySectionAccess(['technicians']), getTechnicianDashboardStats);
router.get('/executive-stats', verifyToken, checkAnySectionAccess(['management', 'products', 'distributors', 'dealers', 'customers', 'replacement', 'sales']), getExecutiveDashboardStats);

export default router;
