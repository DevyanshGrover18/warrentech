import Sale from '../models/Sale.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import DistributorDealerProduct from '../models/DistributorDealerProduct.js';
import Dealer from '../models/Dealer.js';
import mongoose from 'mongoose';
import { getExecutiveScope, getDealerIdsForExecutiveScope } from '../utils/executiveScope.js';

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
  const { productId, dealerId, distributorId, customerName, customerPhone, customerEmail, customerAddress, customerState, customerCity, plumberName, plumberPhone } = req.body;

  try {
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
            });
        }
    }

    const sale = new Sale({
      product: productId,
      dealer: dealerId,
      distributor: distributorId,
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      customerState,
      customerCity,
      plumberName,
      plumberPhone,
      customer: customer ? customer._id : null
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

export const updateSale = async (req, res) => {
  try {
    const { saleId } = req.params;
    const { customerName, customerPhone, customerEmail, customerAddress, plumberName } = req.body;

    const sale = await Sale.findById(saleId);

    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    sale.customerName = customerName || sale.customerName;
    sale.customerPhone = customerPhone || sale.customerPhone;
    sale.customerEmail = customerEmail || sale.customerEmail;
    sale.customerAddress = customerAddress || sale.customerAddress;
    sale.plumberName = plumberName || sale.plumberName;

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
      
      // For now, subDealer is null as it's not in the current schema
      productObj.subDealer = null;
      
      return productObj;
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
            .sort({ soldAt: -1 });
        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
