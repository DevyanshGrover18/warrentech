import Factory from '../models/Factory.js';
import Order, { OrderItem } from '../models/Order.js';
// import Product from '../models/Product.js';
import mongoose from 'mongoose';
import Dealer from '../models/Dealer.js';
import SubDealer from '../models/SubDealer.js';
import Distributor from '../models/Distributor.js';
import Model from '../models/Model.js';
import Sale from '../models/Sale.js';
import UserRole from '../models/UserRole.js';

import ReplacementRequest from '../models/ReplacementRequest.js';
import Product from '../models/Product.js';
import { getExecutiveScope, getCustomerIdsForExecutiveScope, getDealerIdsForExecutiveScope } from '../utils/executiveScope.js';

export const getTechnicianDashboardStats = async (req, res) => {
    try {
        const technicianId = req.user.id;

        const [total, assigned, inProgress, completed] = await Promise.all([
            ReplacementRequest.countDocuments({ assignedTechnician: technicianId }),
            ReplacementRequest.countDocuments({ assignedTechnician: technicianId, status: 'Assigned' }),
            ReplacementRequest.countDocuments({ assignedTechnician: technicianId, status: 'In Progress' }),
            ReplacementRequest.countDocuments({ assignedTechnician: technicianId, status: 'Completed' })
        ]);

        res.json({
            total,
            assigned,
            inProgress,
            completed
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getOrderStats = async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const pendingOrders = await Order.countDocuments({ status: 'Pending' });
        const completedOrders = await Order.countDocuments({ status: 'Completed' });
        // FIX: Changed the query to use the 'status' field, consistent with your schema
        const dispatchedOrders = await Order.countDocuments({ status: 'Dispatched' });

        res.json({
            total: totalOrders,
            pending: pendingOrders,
            completed: completedOrders,
            dispatched: dispatchedOrders
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// FIX: The floating try...catch block is now wrapped in a proper exported function.
export const getDashboardStats = async (req, res) => {
    try {
        const user = req.user;
        const isAdmin = user.role === 'admin';
        
        let permissions = {};
        if (user.role === 'member') {
            const member = await UserRole.findById(user.id);
            permissions = member?.accessControl || {};
        }

        const canView = (section) => {
            if (isAdmin) return true;
            const p = permissions[section];
            if (!p) return false;
            return !!(p.full || p.view || p.add || p.modify || p.delete);
        };

        const [factories, orders, dealers, subDealers, distributors, models, saleCount, productSoldCount] = await Promise.all([
            canView('factories') ? Factory.countDocuments() : Promise.resolve(0),
            canView('orders') ? Order.countDocuments() : Promise.resolve(0),
            canView('dealers') ? Dealer.countDocuments() : Promise.resolve(0),
            canView('dealers') ? SubDealer.countDocuments() : Promise.resolve(0),
            canView('distributors') ? Distributor.countDocuments() : Promise.resolve(0),
            canView('management') ? Model.countDocuments() : Promise.resolve(0),
            canView('sales') ? Sale.countDocuments() : Promise.resolve(0),
            canView('sales') ? Product.countDocuments({ sold: true }) : Promise.resolve(0)
        ]);

        res.json({
            factories,
            orders,
            dealers,
            subDealers,
            distributors,
            models,
            sales: Math.max(saleCount, productSoldCount)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getOrderItemStats = async (req, res) => {
    try {
        const pendingItems = await OrderItem.countDocuments({ status: 'Pending' });
        const completedItems = await OrderItem.countDocuments({ status: 'Completed' });
        const dispatchedItems = await OrderItem.countDocuments({ status: 'Dispatched' });

        res.json({
            pending: pendingItems,
            completed: completedItems,
            dispatched: dispatchedItems
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getMonthlySalesData = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const salesData = await Sale.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(currentYear, 0, 1),
                        $lt: new Date(currentYear + 1, 0, 1)
                    }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            {
                $unwind: '$productDetails'
            },
            {
                $group: {
                    _id: { $month: '$createdAt' },
                    total: { $sum: '$productDetails.price' }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        res.json(salesData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getExecutiveDashboardStats = async (req, res) => {
    try {
        const scope = await getExecutiveScope(req.user);

        if (!scope.isExecutive) {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const distributorIds = scope.distributorIds;

        if (distributorIds.length === 0) {
            return res.json({
                products: 0,
                distributors: 0,
                dealers: 0,
                customers: 0,
                replacementRequests: 0,
                sales: 0
            });
        }

        const distributorObjectIds = distributorIds.map(id => new mongoose.Types.ObjectId(id));

        const [products, distributors, dealerIds, customerIds, replacementRequests, saleRecordsCount, productSoldCount] = await Promise.all([
            Product.countDocuments({ distributor: { $in: distributorIds } }),
            Distributor.countDocuments({ _id: { $in: distributorIds } }),
            getDealerIdsForExecutiveScope(req.user),
            getCustomerIdsForExecutiveScope(req.user),
            ReplacementRequest.aggregate([
                {
                    $lookup: {
                        from: 'products',
                        localField: 'product',
                        foreignField: '_id',
                        as: 'productInfo'
                    }
                },
                { $unwind: '$productInfo' },
                {
                    $match: {
                        'productInfo.distributor': { $in: distributorObjectIds }
                    }
                },
                { $count: 'count' }
            ]),
            Sale.aggregate([
                {
                    $lookup: {
                        from: 'products',
                        localField: 'product',
                        foreignField: '_id',
                        as: 'productInfo'
                    }
                },
                { $unwind: '$productInfo' },
                {
                    $match: {
                        'productInfo.distributor': { $in: distributorObjectIds }
                    }
                },
                { $count: 'count' }
            ]),
            Product.countDocuments({
                distributor: { $in: distributorIds },
                sold: true
            })
        ]);

        res.json({
            products,
            distributors,
            dealers: dealerIds.length,
            customers: customerIds.length,
            replacementRequests: replacementRequests[0]?.count || 0,
            sales: Math.max(saleRecordsCount[0]?.count || 0, productSoldCount)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
