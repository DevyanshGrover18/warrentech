import express from 'express';
import {
  createCustomer,
  getCustomers,
  getCustomerPurchases,
  updateCustomerCredentials,
  checkPhone,
  setCustomerPassword,
  deleteCustomers,
} from '../controllers/customerController.js';import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes for customer registration
router.post('/check-phone', checkPhone);
router.post('/set-password', setCustomerPassword);

// Admin-only endpoints
router.post('/', protect, authorize(['admin']), createCustomer);
router.get('/', protect, authorize(['admin', 'executive']), getCustomers);
router.delete('/', protect, authorize(['admin']), deleteCustomers);
router.get('/:id/purchases', protect, authorize(['admin', 'executive']), getCustomerPurchases);
router.put('/:id/credentials', protect, authorize(['admin']), updateCustomerCredentials);

export default router;
