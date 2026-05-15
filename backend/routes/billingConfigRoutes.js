import express from 'express';
import { getBillingConfig, updateInWarrantyConfig, updateOutOfWarrantyConfig } from '../controllers/billingConfigController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, authorize(['admin', 'customer' , 'technician', 'executive']), getBillingConfig);
router.put('/in-warranty', protect, authorize(['admin']), updateInWarrantyConfig);
router.put('/out-of-warranty', protect, authorize(['admin']), updateOutOfWarrantyConfig);

export default router;
