import Sale from '../models/Sale.js';
import WalletTransaction from '../models/WalletTransaction.js';
import IncentiveSetting from '../models/IncentiveSetting.js';
import { ensureIncentiveSettings } from '../utils/incentiveUtils.js';
import { getSalesAccessContext } from '../utils/salesAccess.js';
import { applyWalletTransaction } from '../utils/walletUtils.js';

const requireSalesManager = async (user) => {
    const access = await getSalesAccessContext(user);

    if (!access.isAdmin && !access.canAccessSales) {
        const error = new Error('Access denied');
        error.statusCode = 403;
        throw error;
    }

    return access;
};

export const getIncentiveSettings = async (req, res) => {
    try {
        await requireSalesManager(req.user);
        const settings = await ensureIncentiveSettings();
        res.json(settings);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const updateIncentiveSettings = async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ message: 'Only admin can update incentive settings.' });
        }

        const settings = await ensureIncentiveSettings();
        settings.distributorPerSaleIncentive = Number(req.body.distributorPerSaleIncentive) || 0;
        settings.dealerPerSaleIncentive = Number(req.body.dealerPerSaleIncentive) || 0;
        await settings.save();

        const pendingSales = await Sale.find({ incentiveStatus: 'pending_approval' });
        await Promise.all(pendingSales.map(async (sale) => {
            if (sale.incentiveType === 'distributor') {
                sale.incentiveAmount = settings.distributorPerSaleIncentive;
            } else if (sale.incentiveType === 'dealer') {
                sale.incentiveAmount = settings.dealerPerSaleIncentive;
            }
            await sale.save();
        }));

        res.json(settings);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const getIncentives = async (req, res) => {
    try {
        await requireSalesManager(req.user);

        const { status = 'all' } = req.query;
        const filter = status === 'all'
            ? { incentiveStatus: { $in: ['incomplete', 'pending_approval', 'approved', 'rejected'] } }
            : { incentiveStatus: status };

        const incentives = await Sale.find(filter)
            .populate({
                path: 'product',
                populate: { path: 'model' },
            })
            .populate('dealer', 'name dealerId walletBalance')
            .populate('distributor', 'name distributorId walletBalance')
            .populate('customer', 'name phone email')
            .sort({ updatedAt: -1, soldAt: -1 });

        res.json(incentives);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const approveIncentive = async (req, res) => {
    try {
        await requireSalesManager(req.user);

        const sale = await Sale.findById(req.params.saleId);
        if (!sale) {
            return res.status(404).json({ message: 'Sale not found.' });
        }

        if (sale.incentiveStatus !== 'pending_approval') {
            return res.status(400).json({ message: 'Only pending incentives can be approved.' });
        }

        const existingTransaction = await WalletTransaction.findOne({
            source: 'sale_incentive',
            saleId: sale._id,
        });

        if (existingTransaction) {
            return res.status(400).json({ message: 'This incentive has already been posted to a wallet.' });
        }

        const entityType = sale.incentiveType;
        const entityId = sale.createdByEntityId;

        const { transaction } = await applyWalletTransaction({
            entityType,
            entityId,
            type: 'credit',
            source: 'sale_incentive',
            amount: sale.incentiveAmount,
            saleId: sale._id,
            notes: `Approved incentive for sale ${sale._id}`,
            performedBy: req.user.id,
        });

        sale.incentiveStatus = 'approved';
        sale.incentiveApprovedBy = req.user.id;
        sale.incentiveApprovedAt = new Date();
        sale.incentiveRejectedBy = null;
        sale.incentiveRejectedAt = null;
        sale.incentiveRejectionNote = '';
        await sale.save();

        res.json({ message: 'Incentive approved successfully.', sale, transaction });
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const rejectIncentive = async (req, res) => {
    try {
        await requireSalesManager(req.user);

        const sale = await Sale.findById(req.params.saleId);
        if (!sale) {
            return res.status(404).json({ message: 'Sale not found.' });
        }

        if (sale.incentiveStatus !== 'pending_approval') {
            return res.status(400).json({ message: 'Only pending incentives can be rejected.' });
        }

        const note = (req.body.note || '').trim();
        if (!note) {
            return res.status(400).json({ message: 'A rejection reason is required.' });
        }

        sale.incentiveStatus = 'rejected';
        sale.incentiveRejectedBy = req.user.id;
        sale.incentiveRejectedAt = new Date();
        sale.incentiveRejectionNote = note;
        sale.incentiveApprovedBy = null;
        sale.incentiveApprovedAt = null;
        await sale.save();

        res.json({ message: 'Incentive rejected successfully.', sale });
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};
