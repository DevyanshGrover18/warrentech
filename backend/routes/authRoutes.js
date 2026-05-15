import express from 'express';
import { login, createDefaultUsers, getFactoryUsers, requestPasswordReset, getPasswordResetRequests, resetPassword, declinePasswordResetRequest, registerCustomer, loginCustomer, signupAdmin } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', login);
router.post('/customer/register', registerCustomer);
router.post('/customer/login', loginCustomer);
router.post('/create-default-users', createDefaultUsers);
router.get('/factory-users', getFactoryUsers);
router.post('/request-password-reset', requestPasswordReset);
router.get('/password-reset-requests', getPasswordResetRequests);
router.post('/reset-password', resetPassword);
router.delete('/password-reset-requests/:id', declinePasswordResetRequest);

export default router;