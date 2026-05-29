import express from 'express';
import { getBillingConfig, updateInWarrantyConfig, updateOutOfWarrantyConfig, updateSaleEditDeadline } from '../controllers/billingConfigController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, authorize(['admin', 'customer', 'technician', 'executive', 'dealer', 'distributor', 'sub_dealer']), getBillingConfig);
router.put('/in-warranty', protect, authorize(['admin']), updateInWarrantyConfig);
router.put('/out-of-warranty', protect, authorize(['admin']), updateOutOfWarrantyConfig);
router.put('/sale-edit-deadline', protect, authorize(['admin']), updateSaleEditDeadline);

export default router;
