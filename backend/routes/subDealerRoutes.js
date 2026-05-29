import express from 'express';
import {
    getSubDealers,
    createSubDealer,
    updateSubDealer,
    deleteSubDealer
} from '../controllers/subDealerController.js';
import { verifyToken, checkPermission, checkSectionAccess } from '../middleware/roleMiddleware.js';

const router = express.Router();

// @route   GET /api/sub-dealers
router.get('/', verifyToken, getSubDealers);

// @route   POST /api/sub-dealers
router.post('/', verifyToken, createSubDealer);

// @route   PUT /api/sub-dealers/:id
router.put('/:id', verifyToken, updateSubDealer);

// @route   DELETE /api/sub-dealers/:id
router.delete('/:id', verifyToken, deleteSubDealer);

export default router;
