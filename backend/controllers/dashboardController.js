import Factory from '../models/Factory.js';
import Order, { OrderItem } from '../models/Order.js';
// import Product from '../models/Product.js';
import mongoose from 'mongoose';
import Dealer from '../models/Dealer.js';
import Distributor from '../models/Distributor.js';
import Model from '../models/Model.js';
import Sale from '../models/Sale.js';

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
        const factoryCount = await Factory.countDocuments();
        const orderCount = await Order.countDocuments();
        // const productCount = await Product.countDocuments();
        const dealerCount = await Dealer.countDocuments();
        const distributorCount = await Distributor.countDocuments();
        const modelCount = await Model.countDocuments();

        res.json({
            factories: factoryCount,
            orders: orderCount,
            // products: productCount,
            dealers: dealerCount,
            distributors: distributorCount,
            models: modelCount
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
            });
        }

        const [products, distributors, dealerIds, customerIds, replacementRequests] = await Promise.all([
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
                        'productInfo.distributor': { $in: distributorIds.map(id => new mongoose.Types.ObjectId(id)) }
                    }
                },
                { $count: 'count' }
            ]),
        ]);

        res.json({
            products,
            distributors,
            dealers: dealerIds.length,
            customers: customerIds.length,
            replacementRequests: replacementRequests[0]?.count || 0,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
