import express from 'express';
import { getFactories, getFactoryById, createFactory, updateFactory, deleteFactory, getFactoryOrders, updateOrderItemStatus, bulkUpdateOrderItemStatus, getFactorySales, deleteMultipleFactories, checkFactoryCodeUniqueness, getNewOrdersCount, markOrdersSeen } from '../controllers/factoryController.js';
import { verifyToken, checkPermission, checkSectionAccess, checkAnySectionAccess } from '../middleware/roleMiddleware.js';

const router = express.Router();

// @route   GET /api/factories
router.get('/', verifyToken, checkAnySectionAccess(['factories', 'products', 'sales']), getFactories);

// @route   GET /api/factories/:id
router.get('/:id', verifyToken, getFactoryById);

// @route   POST /api/factories
router.get('/check-code/:code', verifyToken, checkFactoryCodeUniqueness);

// @route   POST /api/factories
router.post('/', verifyToken, checkPermission('factories', 'add'), createFactory);

// @route   PUT /api/factories/:id
router.put('/:id', verifyToken, checkPermission('factories', 'modify'), updateFactory);

// @route   DELETE /api/factories/:id
router.delete('/:id', verifyToken, checkPermission('factories', 'delete'), deleteFactory);

// @route   DELETE /api/factories/
router.delete('/', verifyToken, checkPermission('factories', 'delete'), deleteMultipleFactories);

// @route   GET /api/factories/:id/orders
router.get('/:id/orders', getFactoryOrders);

// @route   GET /api/factories/:id/sales
router.get('/:id/sales', getFactorySales);

// New routes for new orders count and marking orders as seen
router.get('/:id/new-orders-count', getNewOrdersCount);
router.patch('/:id/mark-orders-seen', markOrdersSeen);

// @route   PATCH /api/factories/:id/orders/:itemId/status
router.patch('/:id/orders/:itemId/status', updateOrderItemStatus);

// @route   PATCH /api/factories/:id/orders/bulk-status
router.patch('/:id/orders/bulk-status', bulkUpdateOrderItemStatus);

export default router;