import Sale from '../models/Sale.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import DistributorDealerProduct from '../models/DistributorDealerProduct.js';
import Dealer from '../models/Dealer.js';
import UserRole from '../models/UserRole.js';
import BillingConfig from '../models/BillingConfig.js';
import WalletTransaction from '../models/WalletTransaction.js';
import mongoose from 'mongoose';
import { getExecutiveScope, getDealerIdsForExecutiveScope } from '../utils/executiveScope.js';
import { isSaleFormComplete, recomputeSaleIncentive } from '../utils/incentiveUtils.js';
import { getSalesAccessContext } from '../utils/salesAccess.js';
import { applyWalletTransaction } from '../utils/walletUtils.js';

const SALE_EDITABLE_FIELDS = [
    'customerName',
    'customerPhone',
    'customerEmail',
    'customerAddress',
    'customerState',
    'customerCity',
    'plumberName',
    'plumberPhone',
    'soldBy',
];

const applySalePayload = (sale, payload) => {
    let hasTrackedChanges = false;

    for (const field of SALE_EDITABLE_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(payload, field)) {
            sale[field] = payload[field];
            hasTrackedChanges = true;
        }
    }

    return hasTrackedChanges;
};

const syncCustomerForSale = async (sale) => {
    if (!sale.customerPhone) {
        return sale;
    }

    let customer = await Customer.findOne({ phone: sale.customerPhone });

    if (!customer) {
        customer = await Customer.create({
            name: sale.customerName,
            phone: sale.customerPhone,
            email: sale.customerEmail,
            address: sale.customerAddress,
            state: sale.customerState,
            city: sale.customerCity,
            plumberName: sale.plumberName,
            plumberPhone: sale.plumberPhone,
        });
    } else {
        customer.name = sale.customerName || customer.name;
        customer.email = sale.customerEmail || customer.email;
        customer.address = sale.customerAddress || customer.address;
        customer.state = sale.customerState || customer.state;
        customer.city = sale.customerCity || customer.city;
        customer.plumberName = sale.plumberName || customer.plumberName;
        customer.plumberPhone = sale.plumberPhone || customer.plumberPhone;
        await customer.save();
    }

    sale.customer = customer._id;
    return sale;
};

const revokeApprovedIncentiveIfNeeded = async (sale, performedBy) => {
    if (sale.incentiveStatus !== 'approved' || !sale.createdByEntityType || !sale.createdByEntityId) {
        return;
    }

    const creditedTransaction = await WalletTransaction.findOne({
        source: 'sale_incentive',
        saleId: sale._id,
        type: 'credit',
    }).sort({ createdAt: -1 });

    if (!creditedTransaction) {
        return;
    }

    const existingReversal = await WalletTransaction.findOne({
        source: 'sale_incentive',
        saleId: sale._id,
        type: 'debit',
    });

    if (existingReversal) {
        return;
    }

    await applyWalletTransaction({
        entityType: sale.createdByEntityType,
        entityId: sale.createdByEntityId,
        type: 'debit',
        source: 'sale_incentive',
        amount: creditedTransaction.amount,
        saleId: sale._id,
        notes: `Reversed incentive for sale ${sale._id} after admin edit`,
        performedBy,
    });
};

export const getDealerSales = async (req, res) => {
    try {
        const distributorId = new mongoose.Types.ObjectId(req.user.distributor);

        const dealerSales = await Dealer.aggregate([
            {
                $match: { distributor: distributorId }
            },
            {
                $lookup: {
                    from: 'distributordealerproducts',
                    localField: '_id',
                    foreignField: 'dealer',
                    as: 'assignedProducts'
                }
            },
            {
                $unwind: '$assignedProducts'
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'assignedProducts.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            {
                $unwind: '$productDetails'
            },
            {
                $lookup: {
                    from: 'models',
                    localField: 'productDetails.model',
                    foreignField: '_id',
                    as: 'modelDetails'
                }
            },
            {
                $unwind: '$modelDetails'
            },
            {
                $lookup: {
                    from: 'sales',
                    localField: 'productDetails._id',
                    foreignField: 'product',
                    as: 'saleInfo'
                }
            },
            {
                $unwind: {
                    path: '$saleInfo',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: {
                        dealerId: '$_id',
                        modelId: '$modelDetails._id'
                    },
                    dealerName: { $first: '$name' },
                    modelName: { $first: '$modelDetails.name' },
                    products: { 
                        $push: {
                            serialNumber: '$productDetails.serialNumber',
                            dateAssigned: '$assignedProducts.createdAt',
                            status: { $ifNull: ['$saleInfo', 'Not Sold'] }
                        }
                    },
                    totalProducts: { $sum: 1 },
                    soldProducts: { $sum: { $cond: [{ $ifNull: ['$saleInfo', false] }, 1, 0] } }
                }
            },
            {
                $addFields: {
                    status: {
                        $cond: {
                            if: { $eq: ['$soldProducts', '$totalProducts'] },
                            then: 'Sold',
                            else: {
                                $cond: {
                                    if: { $gt: ['$soldProducts', 0] },
                                    then: 'Partially Sold',
                                    else: 'Not Sold'
                                }
                            }
                        }
                    }
                }
            },
            {
                $group: {
                    _id: '$_id.dealerId',
                    dealerName: { $first: '$dealerName' },
                    models: {
                        $push: {
                            modelId: '$_id.modelId',
                            modelName: '$modelName',
                            products: '$products',
                            status: '$status'
                        }
                    },
                    productCount: { $sum: '$totalProducts' }
                }
            },
            {
                $project: {
                    _id: 1,
                    name: '$dealerName',
                    productCount: 1,
                    models: 1
                }
            }
        ]);

        res.json(dealerSales);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createSale = async (req, res) => {
  const { productId, customerName, customerPhone, customerEmail, customerAddress, customerState, customerCity, plumberName, plumberPhone, soldBy } = req.body;

  try {
    if (!req.user || !['dealer', 'distributor', 'sub_dealer'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only distributors, dealers and sub dealers can create sales.' });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.sold) {
      return res.status(400).json({ message: 'Product already sold' });
    }

    // Find or create customer
    let customer;
    if (customerPhone) {
        customer = await Customer.findOne({ phone: customerPhone });
        if (!customer) {
            customer = await Customer.create({
                name: customerName,
                phone: customerPhone,
                email: customerEmail,
                address: customerAddress,
                state: customerState,
                city: customerCity,
                plumberName: plumberName,
                plumberPhone: plumberPhone,
            });
        }
    }

    const sale = new Sale({
      product: productId,
      dealer: req.user.role === 'dealer' ? req.user.dealer : (req.user.role === 'sub_dealer' ? req.user.subDealer?.dealer : null),
      subDealer: req.user.role === 'sub_dealer' ? req.user.subDealer : null,
      distributor: req.user.role === 'distributor' ? req.user.distributor : null,
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      customerState,
      customerCity,
      plumberName,
      plumberPhone,
      soldBy,
      customer: customer ? customer._id : null,
      createdByRole: req.user.role,
      createdByUserId: req.user.id,
      createdByEntityType: req.user.role,
      createdByEntityId: req.user.role === 'dealer' ? req.user.dealer : (req.user.role === 'sub_dealer' ? req.user.subDealer : req.user.distributor),
      incentiveStatus: isSaleFormComplete({
        customerName,
        customerPhone,
        customerEmail,
        customerAddress,
        customerState,
        customerCity,
        plumberName,
        plumberPhone,
      }) ? 'pending_approval' : 'incomplete',
    });

    // If sub_dealer is selling, we need to find the dealer they belong to if not already populated
    if (req.user.role === 'sub_dealer' && !sale.dealer) {
        const SubDealer = mongoose.model('SubDealer');
        const sd = await SubDealer.findById(req.user.subDealer);
        if (sd) {
            sale.dealer = sd.dealer;
        }
    }

    await recomputeSaleIncentive(sale, {
      editedByRole: req.user.role,
      editedByUserId: req.user.id,
    });

    product.sold = true;
    product.status = 'Inactive';
    product.saleDate = new Date();

    await sale.save();
    await product.save();

    res.status(201).json(sale);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSalesByCustomer = async (req, res) => {
  try {
    // req.user should contain id and role from token
    if (!req.user || req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const customerId = req.user.id;

    // Fetch customer to get phone (for legacy sales linked by phone only)
    const customer = await Customer.findById(customerId);

    const phone = customer?.phone;

    let sales = await Sale.find({
      $or: [
        { customer: customerId },
        ...(phone ? [{ customerPhone: phone }] : [])
      ]
    })
      .populate({ path: 'product', populate: { path: 'model' } })
      .populate('dealer')
      .populate('distributor')
      .sort({ soldAt: -1 })
      .lean();

    // Enrich each sale with warranty info based on model.warranty and seller demographics
    const now = new Date();
    sales = sales.map(sale => {
      try {
        const model = sale.product?.model;
        const seller = sale.distributor || sale.dealer || null;
        let warrantyInfo = null;

        if (model && Array.isArray(model.warranty) && model.warranty.length > 0) {
          // Try exact city+state match, then state match, then fallback to first
          const candidate = model.warranty.find(w => seller && w.state === seller.state && w.city === seller.city)
            || model.warranty.find(w => seller && w.state === seller.state)
            || model.warranty[0];

          if (candidate) {
            const months = candidate.durationType === 'Years' ? candidate.duration * 12 : candidate.duration;
            const soldAt = sale.soldAt ? new Date(sale.soldAt) : (sale.createdAt ? new Date(sale.createdAt) : now);
            const expiry = new Date(soldAt);
            expiry.setMonth(expiry.getMonth() + months);
            const inWarranty = expiry >= now;

            warrantyInfo = {
              state: candidate.state,
              city: candidate.city,
              durationType: candidate.durationType,
              duration: candidate.duration,
              durationMonths: months,
              expiryDate: expiry,
              inWarranty
            };
          }
        }

        return {
          ...sale,
          warrantyInfo
        };
      } catch (err) {
        return sale;
      }
    });

    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSalesByDealer = async (req, res) => {
  try {
    const sales = await Sale.find({ dealer: req.params.dealerId })
      .populate('product')
      .populate('dealer');
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSalesBySubDealer = async (req, res) => {
    try {
      const sales = await Sale.find({ subDealer: req.params.subDealerId })
        .populate({ path: 'product', populate: { path: 'model' } })
        .populate('subDealer')
        .populate('dealer');
      res.json(sales);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
};

export const updateSale = async (req, res) => {
  try {
    const { saleId } = req.params;

    const sale = await Sale.findById(saleId);

    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const isOriginalSeller =
      sale.createdByUserId &&
      sale.createdByUserId.toString() === req.user.id &&
      sale.createdByRole === req.user.role;

    const salesAccess = await getSalesAccessContext(req.user);
    const canAdminEdit = req.user.role === 'admin' || salesAccess.canAccessSales;

    if (!isOriginalSeller && !canAdminEdit) {
      return res.status(403).json({ message: 'You do not have permission to edit this sale.' });
    }

    // Check deadline for non-admin sellers
    if (!canAdminEdit && isOriginalSeller) {
        const config = await BillingConfig.findOne();
        const deadlineValue = config?.saleEditDeadlineValue ?? 24;
        const deadlineUnit = config?.saleEditDeadlineUnit ?? 'hrs';
        
        const saleDate = new Date(sale.soldAt || sale.createdAt);
        const now = new Date();
        let deadlineMs = deadlineValue * 60 * 60 * 1000;
        if (deadlineUnit === 'days') {
            deadlineMs = deadlineValue * 24 * 60 * 60 * 1000;
        }
        
        if (now - saleDate > deadlineMs) {
            return res.status(403).json({ message: 'The time period for editing this sale has expired.' });
        }
    }

    const hasTrackedChanges = applySalePayload(sale, req.body);

    if (hasTrackedChanges) {
      if (!isOriginalSeller && canAdminEdit) {
        sale.adminTouchedForm = true;
        await revokeApprovedIncentiveIfNeeded(sale, req.user.id);
      }

      if (!sale.adminTouchedForm) {
        await recomputeSaleIncentive(sale, {
          editedByRole: req.user.role,
          editedByUserId: req.user.id,
        });
      } else {
        sale.incentiveEligible = false;
        sale.incentiveAmount = 0;
        sale.incentiveStatus = 'not_applicable';
        sale.incentiveApprovedBy = null;
        sale.incentiveApprovedAt = null;
        sale.incentiveRejectedBy = null;
        sale.incentiveRejectedAt = null;
        sale.incentiveRejectionNote = '';
      }
    }

    await syncCustomerForSale(sale);

    const updatedSale = await sale.save();
    res.json(updatedSale);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAssignedProducts = async (req, res) => {
  try {
    const scope = await getExecutiveScope(req.user);
    const productFilter = scope.isExecutive
      ? { distributor: { $in: scope.distributorIds } }
      : { distributor: { $ne: null } };

    // Get all products that are assigned to distributors
    const products = await Product.find(productFilter)
    .populate('model')
    .populate('distributor')
    .populate('factory')
    .sort({ assignedToDistributorAt: -1, createdAt: -1 });

    // Get dealer assignments for these products
    const productIds = products.map(p => p._id);
    const dealerAssignments = await DistributorDealerProduct.find({
      product: { $in: productIds }
    })
    .populate('dealer')
    .populate('distributor');

    // Create a map for quick lookup
    const dealerMap = {};
    dealerAssignments.forEach(assignment => {
      dealerMap[assignment.product.toString()] = assignment.dealer;
    });

    // Add dealer info and assignment date to products
    const enrichedProducts = products.map(product => {
      const productObj = product.toObject();
      productObj.dealer = dealerMap[product._id.toString()] || null;
      productObj.assignedToDistributorAt = product.updatedAt; // When distributor was assigned
      return productObj;
    });

    // Get sub-dealer assignments
    const subDealerAssignments = await mongoose.model('DealerSubDealerProduct').find({
        product: { $in: productIds }
    }).populate('subDealer');

    const subDealerMap = {};
    subDealerAssignments.forEach(assignment => {
        subDealerMap[assignment.product.toString()] = assignment.subDealer;
    });

    // Attach sub-dealer info
    enrichedProducts.forEach(p => {
        p.subDealer = subDealerMap[p._id.toString()] || null;
    });

    // Fetch any sales related to these products so we can include customer details
    const productIdStrings = productIds.map(id => id.toString());
    // Fetch sales for these products, prefer most recent sale when multiple exist
    const sales = await Sale.find({ product: { $in: productIds } })
      .sort({ soldAt: -1, saleDate: -1, createdAt: -1 })
      .lean();
    const saleMap = {};
    // Keep only the most recent sale per product
    for (const s of sales) {
      if (!s.product) continue;
      const pid = s.product.toString();
      if (!saleMap[pid]) saleMap[pid] = s;
    }

    // Attach sale info to enriched products
    enrichedProducts.forEach(p => {
      const s = saleMap[p._id.toString()];
      if (s) {
        p.sale = {
          customerName: s.customerName || null,
          customerPhone: s.customerPhone || null,
          customerEmail: s.customerEmail || null,
          customerAddress: s.customerAddress || null,
          customerState: s.customerState || null,
          customerCity: s.customerCity || null,
          plumberName: s.plumberName || null,
          plumberPhone: s.plumberPhone || null,
          adminTouchedForm: Boolean(s.adminTouchedForm),
          incentiveStatus: s.incentiveStatus || null,
          soldAt: s.soldAt || s.saleDate || s.createdAt || null,
          _id: s._id
        };
      } else {
        p.sale = null;
      }
    });

    res.json(enrichedProducts);
  } catch (error) {
    console.error('Error fetching assigned products:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getAllSales = async (req, res) => {
    try {
        const scope = await getExecutiveScope(req.user);
        const dealerIds = scope.isExecutive ? await getDealerIdsForExecutiveScope(req.user) : [];
        const salesFilter = scope.isExecutive
            ? {
                $or: [
                    { distributor: { $in: scope.distributorIds } },
                    { dealer: { $in: dealerIds } }
                ]
            }
            : {};

        const sales = await Sale.find(salesFilter)
            .populate({
                path: 'product',
                populate: {
                    path: 'model'
                }
            })
            .populate('dealer', 'name dealerId walletBalance')
            .populate('distributor', 'name distributorId walletBalance')
            .populate('customer', 'name phone email address state city')
            .sort({ soldAt: -1 });
        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
