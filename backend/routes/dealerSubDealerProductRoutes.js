import express from 'express';
import {
    assignProductToSubDealerBySerial,
    getSubDealerProducts,
    bulkAssignProductsToSubDealer
} from '../controllers/dealerSubDealerProductController.js';
import { verifyToken } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.post('/assign-by-serial', verifyToken, assignProductToSubDealerBySerial);
router.post('/bulk-assign', verifyToken, bulkAssignProductsToSubDealer);
router.get('/', verifyToken, getSubDealerProducts);
router.get('/:subDealerId', verifyToken, getSubDealerProducts);

export default router;
