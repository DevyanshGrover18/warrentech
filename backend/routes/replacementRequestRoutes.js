import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createReplacementRequest, getReplacementRequests, updateReplacementRequestStatus, getReplacementRequestsByCustomer, addDiagnosis } from '../controllers/replacementRequestController.js';
import { verifyToken } from '../middleware/roleMiddleware.js';

const router = express.Router();

const uploadDir = 'public/uploads/complaints';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });
// --- End Multer Configuration ---

const isAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'executive')) {
        next();
    } else {
        res.status(403).json({ message: 'Access denied.' });
    }
};

const isAdminOrTechnician = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'technician' || req.user.role === 'executive')) {
        next();
    } else {
        res.status(403).json({ message: 'Access denied.' });
    }
};

router.post('/', verifyToken, upload.single('media'), createReplacementRequest);
router.get('/', verifyToken, isAdmin, getReplacementRequests);
router.get('/customer', verifyToken, getReplacementRequestsByCustomer);
router.put('/:id', verifyToken, isAdminOrTechnician, updateReplacementRequestStatus);
router.post('/:id/diagnose', verifyToken, isAdminOrTechnician, upload.fields([{ name: 'beforeImage', maxCount: 1 }, { name: 'afterImage', maxCount: 1 }]), addDiagnosis);

export default router;
