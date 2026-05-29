import Sale from '../models/Sale.js';
import WalletTransaction from '../models/WalletTransaction.js';
import IncentiveSetting from '../models/IncentiveSetting.js';
import { ensureIncentiveSettings, getIncentiveAmountForType } from '../utils/incentiveUtils.js';
import { getSalesAccessContext } from '../utils/salesAccess.js';
import { applyWalletTransaction } from '../utils/walletUtils.js';

const ACTIONABLE_STATUSES = ['pending_approval', 'incomplete'];

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
        settings.subDealerPerSaleIncentive = Number(req.body.subDealerPerSaleIncentive) || 0;
        await settings.save();

        const pendingSales = await Sale.find({ incentiveStatus: 'pending_approval' });
        await Promise.all(pendingSales.map(async (sale) => {
            if (sale.incentiveType === 'distributor') {
                sale.incentiveAmount = settings.distributorPerSaleIncentive;
            } else if (sale.incentiveType === 'dealer') {
                sale.incentiveAmount = settings.dealerPerSaleIncentive;
            } else if (sale.incentiveType === 'sub_dealer') {
                sale.incentiveAmount = settings.subDealerPerSaleIncentive;
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

        const { status = 'all', limit, page = 1 } = req.query;
        const filter = status === 'all'
            ? { incentiveStatus: { $in: ['incomplete', 'pending_approval', 'approved', 'rejected'] } }
            : { incentiveStatus: status };

        let query = Sale.find(filter)
            .populate({
                path: 'product',
                populate: { path: 'model' },
            })
            .populate('dealer', 'name dealerId walletBalance')
            .populate('distributor', 'name distributorId walletBalance')
            .populate('customer', 'name phone email')
            .sort({ updatedAt: -1, soldAt: -1 });

        if (limit) {
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const [data, total] = await Promise.all([
                query.skip(skip).limit(parseInt(limit)),
                Sale.countDocuments(filter)
            ]);
            return res.json({
                data,
                total,
                page: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit))
            });
        }

        const incentives = await query;
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

        if (!ACTIONABLE_STATUSES.includes(sale.incentiveStatus)) {
            return res.status(400).json({ message: 'Only pending or incomplete incentives can be approved.' });
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
        const incentiveAmount = sale.incentiveAmount > 0
            ? sale.incentiveAmount
            : await getIncentiveAmountForType(entityType);

        const { transaction } = await applyWalletTransaction({
            entityType,
            entityId,
            type: 'credit',
            source: 'sale_incentive',
            amount: incentiveAmount,
            saleId: sale._id,
            notes: `Approved incentive for sale ${sale._id}`,
            performedBy: req.user.id,
        });

        sale.incentiveAmount = incentiveAmount;
        sale.incentiveEligible = true;
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

        if (!ACTIONABLE_STATUSES.includes(sale.incentiveStatus)) {
            return res.status(400).json({ message: 'Only pending or incomplete incentives can be rejected.' });
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
