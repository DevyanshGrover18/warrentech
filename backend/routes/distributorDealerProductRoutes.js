import express from 'express';
import {
    assignProductToDealer,
    getDealerProducts,
    getDistributorAssignedProducts
} from '../controllers/distributorDealerController.js';
import { verifyToken } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.post('/assign', assignProductToDealer);
router.get('/dealer/:dealerId/products', getDealerProducts);
router.get('/distributor/assigned', verifyToken, getDistributorAssignedProducts);

export default router;
