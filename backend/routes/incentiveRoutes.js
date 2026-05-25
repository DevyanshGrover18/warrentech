import express from 'express';
import { verifyToken } from '../middleware/roleMiddleware.js';
import {
    approveIncentive,
    getIncentiveSettings,
    getIncentives,
    rejectIncentive,
    updateIncentiveSettings,
} from '../controllers/incentiveController.js';

const router = express.Router();

router.get('/settings', verifyToken, getIncentiveSettings);
router.put('/settings', verifyToken, updateIncentiveSettings);
router.get('/', verifyToken, getIncentives);
router.post('/:saleId/approve', verifyToken, approveIncentive);
router.post('/:saleId/reject', verifyToken, rejectIncentive);

export default router;
