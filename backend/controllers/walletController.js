import Dealer from '../models/Dealer.js';
import Distributor from '../models/Distributor.js';
import WalletTransaction from '../models/WalletTransaction.js';
import WalletPayoutRequest from '../models/WalletPayoutRequest.js';
import mongoose from 'mongoose';
import { getSalesAccessContext } from '../utils/salesAccess.js';
import { applyWalletTransaction } from '../utils/walletUtils.js';

const getEntityModel = (entityType) => {
    if (entityType === 'dealer') return Dealer;
    if (entityType === 'distributor') return Distributor;
    if (entityType === 'sub_dealer') return mongoose.model('SubDealer');
    return null;
};

const requireSalesManager = async (user) => {
    const access = await getSalesAccessContext(user);

    if (!access.isAdmin && !access.canAccessSales) {
        const error = new Error('Access denied');
        error.statusCode = 403;
        throw error;
    }

    return access;
};

const buildCreatedAtFilter = ({ startDate, endDate } = {}) => {
    const createdAt = {};

    if (startDate) {
        const parsedStartDate = new Date(`${startDate}T00:00:00`);
        if (!Number.isNaN(parsedStartDate.getTime())) {
            createdAt.$gte = parsedStartDate;
        }
    }

    if (endDate) {
        const parsedEndDate = new Date(`${endDate}T23:59:59.999`);
        if (!Number.isNaN(parsedEndDate.getTime())) {
            createdAt.$lte = parsedEndDate;
        }
    }

    return Object.keys(createdAt).length ? createdAt : null;
};

const getWalletPayload = async (entityType, entityId, options = {}) => {
    const Model = getEntityModel(entityType);
    if (!Model) return null;

    const { transactionsLimit, startDate, endDate } = options;

    const entity = await Model.findById(entityId).lean();
    if (!entity) return null;

    const createdAtFilter = buildCreatedAtFilter({ startDate, endDate });
    const transactionFilters = { entityType, entityId };
    const payoutFilters = { entityType, entityId };

    if (createdAtFilter) {
        transactionFilters.createdAt = createdAtFilter;
        payoutFilters.createdAt = createdAtFilter;
    }

    const transactionQuery = WalletTransaction.find(transactionFilters)
        .sort({ createdAt: -1 })
        .populate('saleId', 'customerName customerPhone soldAt createdAt');

    if (transactionsLimit && transactionsLimit !== 'all') {
        transactionQuery.limit(Number(transactionsLimit) || 5);
    }

    const transactions = await transactionQuery.lean();

    const payoutRequests = await WalletPayoutRequest.find(payoutFilters)
        .sort({ createdAt: -1 })
        .populate('walletTransactionId')
        .lean();

    return {
        entityType,
        entity,
        balance: entity.walletBalance || 0,
        transactions,
        payoutRequests,
    };
};

export const getWalletOverview = async (req, res) => {
    try {
        await requireSalesManager(req.user);
        const { transactionsLimit } = req.query;

        const recentTransactionsQuery = WalletTransaction.find({})
            .sort({ createdAt: -1 })
            .populate('saleId', 'customerName soldAt');

        const limit = transactionsLimit === 'all' ? null : (Number(transactionsLimit) || 10);
        if (limit) {
            recentTransactionsQuery.limit(limit);
        }

        const [distributors, dealers, recentTransactions, payoutRequests] = await Promise.all([
            Distributor.find({}, 'name distributorId walletBalance city state status').sort({ name: 1 }).lean(),
            Dealer.find({}, 'name dealerId walletBalance city state status distributor').populate('distributor', 'name distributorId').sort({ name: 1 }).lean(),
            recentTransactionsQuery.lean(),
            WalletPayoutRequest.find({})
                .sort({ createdAt: -1 })
                .limit(50)
                .lean(),
        ]);

        res.json({
            distributors,
            dealers,
            recentTransactions,
            payoutRequests,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const getWalletTransactions = async (req, res) => {
    try {
        await requireSalesManager(req.user);
        const { page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [transactions, total] = await Promise.all([
            WalletTransaction.find({})
                .sort({ createdAt: -1 })
                .populate('saleId', 'customerName soldAt')
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            WalletTransaction.countDocuments({})
        ]);

        // Fetch names for all unique entities in this batch
        const distributorIds = [...new Set(transactions.filter(t => t.entityType === 'distributor').map(t => t.entityId))];
        const dealerIds = [...new Set(transactions.filter(t => t.entityType === 'dealer').map(t => t.entityId))];

        const [distributors, dealers] = await Promise.all([
            Distributor.find({ _id: { $in: distributorIds } }, 'name').lean(),
            Dealer.find({ _id: { $in: dealerIds } }, 'name').lean()
        ]);

        const nameMap = {};
        distributors.forEach(d => nameMap[`distributor:${d._id}`] = d.name);
        dealers.forEach(d => nameMap[`dealer:${d._id}`] = d.name);

        const data = transactions.map(t => ({
            ...t,
            entityName: nameMap[`${t.entityType}:${t.entityId}`] || 'Unknown'
        }));

        res.json({
            data,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const getWalletByEntity = async (req, res) => {
    try {
        await requireSalesManager(req.user);

        const { entityType, entityId } = req.params;
        const { transactionsLimit, startDate, endDate } = req.query;
        const payload = await getWalletPayload(entityType, entityId, { transactionsLimit, startDate, endDate });

        if (!payload) {
            return res.status(404).json({ message: 'Wallet owner not found.' });
        }

        res.json(payload);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const getOwnWallet = async (req, res) => {
    try {
        if (!req.user || !['dealer', 'distributor', 'sub_dealer'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Only dealers, distributors and sub dealers can view this wallet.' });
        }

        const entityType = req.user.role;
        const entityId = req.user.role === 'dealer' ? req.user.dealer : (req.user.role === 'sub_dealer' ? req.user.subDealer : req.user.distributor);
        const { transactionsLimit, startDate, endDate } = req.query;
        const payload = await getWalletPayload(entityType, entityId, { transactionsLimit, startDate, endDate });

        if (!payload) {
            return res.status(404).json({ message: 'Wallet owner not found.' });
        }

        res.json(payload);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const createManualDebit = async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ message: 'Only admin can create manual wallet debits.' });
        }

        const { entityType, entityId } = req.params;
        const { amount, notes = '' } = req.body;
        const numericAmount = Number(amount) || 0;

        if (numericAmount <= 0) {
            return res.status(400).json({ message: 'Amount must be greater than zero.' });
        }

        const payload = await getWalletPayload(entityType, entityId);
        if (!payload) {
            return res.status(404).json({ message: 'Wallet owner not found.' });
        }

        if ((payload.balance || 0) < numericAmount) {
            return res.status(400).json({ message: 'Debit amount exceeds current wallet balance.' });
        }

        const result = await applyWalletTransaction({
            entityType,
            entityId,
            type: 'debit',
            source: 'manual_adjustment',
            amount: numericAmount,
            notes,
            performedBy: req.user.id,
        });

        res.json({
            message: 'Manual debit recorded successfully.',
            transaction: result.transaction,
            balance: result.updatedEntity.walletBalance,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const createPayoutRequest = async (req, res) => {
    try {
        if (!req.user || !['dealer', 'distributor', 'sub_dealer'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Only dealers, distributors and sub dealers can create payout requests.' });
        }

        const entityType = req.user.role;
        const entityId = req.user.role === 'dealer' ? req.user.dealer : (req.user.role === 'sub_dealer' ? req.user.subDealer : req.user.distributor);
        const { amount, reason = '' } = req.body;
        const numericAmount = Number(amount) || 0;

        if (numericAmount <= 0) {
            return res.status(400).json({ message: 'Amount must be greater than zero.' });
        }

        const payload = await getWalletPayload(entityType, entityId);
        if (!payload) {
            return res.status(404).json({ message: 'Wallet owner not found.' });
        }

        if (numericAmount > (payload.balance || 0)) {
            return res.status(400).json({ message: 'Requested amount exceeds current wallet balance.' });
        }

        const payoutRequest = await WalletPayoutRequest.create({
            entityType,
            entityId,
            amount: numericAmount,
            reason,
            requestedBy: req.user.id,
        });

        res.status(201).json({
            message: 'Payout request submitted successfully.',
            payoutRequest,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const approvePayoutRequest = async (req, res) => {
    try {
        await requireSalesManager(req.user);

        const { requestId } = req.params;
        const payoutRequest = await WalletPayoutRequest.findById(requestId);

        if (!payoutRequest) {
            return res.status(404).json({ message: 'Payout request not found.' });
        }

        if (payoutRequest.status !== 'pending') {
            return res.status(400).json({ message: 'Only pending payout requests can be approved.' });
        }

        const payload = await getWalletPayload(payoutRequest.entityType, payoutRequest.entityId);
        if (!payload) {
            return res.status(404).json({ message: 'Wallet owner not found.' });
        }

        if ((payload.balance || 0) < payoutRequest.amount) {
            return res.status(400).json({ message: 'Payout amount exceeds current wallet balance.' });
        }

        const result = await applyWalletTransaction({
            entityType: payoutRequest.entityType,
            entityId: payoutRequest.entityId,
            type: 'debit',
            source: 'wallet_payout',
            amount: payoutRequest.amount,
            notes: payoutRequest.reason,
            performedBy: req.user.id,
        });

        payoutRequest.status = 'approved';
        payoutRequest.approvedBy = req.user.id;
        payoutRequest.approvedAt = new Date();
        payoutRequest.paymentProofPath = req.file ? req.file.path.replace(/\\/g, '/') : '';
        payoutRequest.walletTransactionId = result.transaction._id;
        await payoutRequest.save();

        res.json({
            message: 'Payout request approved successfully.',
            payoutRequest,
            balance: result.updatedEntity.walletBalance,
            transaction: result.transaction,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const rejectPayoutRequest = async (req, res) => {
    try {
        await requireSalesManager(req.user);

        const { requestId } = req.params;
        const note = (req.body.rejectionReason || '').trim();

        if (!note) {
            return res.status(400).json({ message: 'A rejection reason is required.' });
        }

        const payoutRequest = await WalletPayoutRequest.findById(requestId);

        if (!payoutRequest) {
            return res.status(404).json({ message: 'Payout request not found.' });
        }

        if (payoutRequest.status !== 'pending') {
            return res.status(400).json({ message: 'Only pending payout requests can be rejected.' });
        }

        payoutRequest.status = 'rejected';
        payoutRequest.rejectedBy = req.user.id;
        payoutRequest.rejectedAt = new Date();
        payoutRequest.rejectionReason = note;
        await payoutRequest.save();

        res.json({
            message: 'Payout request rejected successfully.',
            payoutRequest,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};
