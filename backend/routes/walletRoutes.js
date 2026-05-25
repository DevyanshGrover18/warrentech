import express from 'express';
import fs from 'fs';
import multer from 'multer';
import { verifyToken } from '../middleware/roleMiddleware.js';
import {
    approvePayoutRequest,
    createManualDebit,
    createPayoutRequest,
    getOwnWallet,
    getWalletByEntity,
    getWalletOverview,
    rejectPayoutRequest,
} from '../controllers/walletController.js';

const router = express.Router();
const uploadDir = 'public/uploads/wallet-payout-proofs';

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({ storage });

router.get('/overview', verifyToken, getWalletOverview);
router.get('/me', verifyToken, getOwnWallet);
router.post('/payout-requests', verifyToken, createPayoutRequest);
router.post('/payout-requests/:requestId/approve', verifyToken, upload.single('paymentProof'), approvePayoutRequest);
router.post('/payout-requests/:requestId/reject', verifyToken, rejectPayoutRequest);
router.get('/:entityType/:entityId', verifyToken, getWalletByEntity);
router.post('/:entityType/:entityId/manual-debit', verifyToken, createManualDebit);

export default router;
