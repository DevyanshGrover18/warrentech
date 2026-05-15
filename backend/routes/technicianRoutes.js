import express from 'express';
import {
    createTechnician,
    getTechnicians,
    updateTechnician,
    deleteTechnician,
    deleteTechnicians,
    checkTechnicianCode,
    getAssignedRequests
} from '../controllers/technicianController.js';
import { verifyToken } from '../middleware/roleMiddleware.js';

const router = express.Router();

const isAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'executive')) {
        next();
    } else {
        res.status(403).json({ message: 'Access denied.' });
    }
};

const isTechnician = (req, res, next) => {
    if (req.user && req.user.role === 'technician') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Technicians only.' });
    }
};

router.get('/', verifyToken, isAdmin, getTechnicians);
router.get('/check-code/:code', verifyToken, isAdmin, checkTechnicianCode);
router.post('/', verifyToken, isAdmin, createTechnician);
router.put('/:id', verifyToken, isAdmin, updateTechnician);
router.delete('/', verifyToken, isAdmin, deleteTechnicians);
router.delete('/:id', verifyToken, isAdmin, deleteTechnician);
router.get('/requests', verifyToken, isTechnician, getAssignedRequests);

export default router;
