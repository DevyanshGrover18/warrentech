import Customer from '../models/Customer.js';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { getCustomerIdsForExecutiveScope } from '../utils/executiveScope.js';

// POST /api/customers
export const createCustomer = async (req, res) => {
    try {
        const { name, phone, email, address, state, city, password } = req.body;

        const customerExists = await Customer.findOne({ phone });

        if (customerExists) {
            return res.status(400).json({ message: 'A customer with this phone number already exists.' });
        }

        const customer = new Customer({
            name,
            phone,
            email,
            address,
            state,
            city,
        });

        if (password) {
            const salt = await bcrypt.genSalt(10);
            customer.password = await bcrypt.hash(password, salt);
        }

        const createdCustomer = await customer.save();
        res.status(201).json(createdCustomer);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/customers
export const getCustomers = async (req, res) => {
  try {
    const executiveCustomerIds = req.user?.role === 'executive'
      ? await getCustomerIdsForExecutiveScope(req.user)
      : null;

    const customers = await Customer.aggregate([
      ...(executiveCustomerIds ? [{
        $match: { _id: { $in: executiveCustomerIds.map(id => new mongoose.Types.ObjectId(id)) } }
      }] : []),
      {
        $lookup: {
          from: 'sales',
          let: { cid: '$_id', phone: '$phone' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$customer', '$$cid'] },
                    { $eq: ['$customerPhone', '$$phone'] }
                  ]
                }
              }
            },
            { $count: 'count' }
          ],
          as: 'purchases'
        }
      },
      {
        $addFields: {
          purchaseCount: { $ifNull: [{ $arrayElemAt: ['$purchases.count', 0] }, 0] }
        }
      },
      {
        $project: {
          name: 1,
          phone: 1,
          email: 1,
          address: 1,
          state: 1,
          city: 1,
          purchaseCount: 1
        }
      }
    ]);

    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/customers/:id/purchases
export const getCustomerPurchases = async (req, res) => {
  try {
    const customerId = req.params.id;
    const executiveCustomerIds = req.user?.role === 'executive'
      ? await getCustomerIdsForExecutiveScope(req.user)
      : null;

    if (executiveCustomerIds && !executiveCustomerIds.includes(customerId.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const customer = await Customer.findById(customerId).lean();
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const phone = customer.phone;

    let sales = await Sale.find({
      $or: [
        { customer: new mongoose.Types.ObjectId(customerId) },
        ...(phone ? [{ customerPhone: phone }] : [])
      ]
    })
      .populate({ path: 'product', populate: { path: 'model' } })
      .populate('dealer')
      .populate('distributor')
      .sort({ soldAt: -1 })
      .lean();

    // Enrich with warranty info similar to customer endpoint
    const now = new Date();
    sales = sales.map(sale => {
      try {
        const model = sale.product?.model;
        const seller = sale.distributor || sale.dealer || null;
        let warrantyInfo = null;

        if (model && Array.isArray(model.warranty) && model.warranty.length > 0) {
          const candidate = model.warranty.find(w => seller && w.state === seller.state && w.city === seller.city)
            || model.warranty.find(w => seller && w.state === seller.state)
            // Fallback to the first defined warranty if no location match
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

        return { ...sale, warrantyInfo };
      } catch (err) {
        // In case of any error in warranty calculation, return the original sale object
        return sale;
      }
    });

    res.json(sales);
  } catch (error) {
    console.error('Error fetching customer purchases:', error);
    res.status(500).json({ message: error.message });
  }
};

export const updateCustomerCredentials = async (req, res) => {
    try {
        const { id } = req.params;
        const { phone, password } = req.body;

        const customer = await Customer.findById(id);

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        if (phone) {
            customer.phone = phone;
        }

        if (password) {
            const salt = await bcrypt.genSalt(10);
            customer.password = await bcrypt.hash(password, salt);
        }

        const updatedCustomer = await customer.save();
        res.json(updatedCustomer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const checkPhone = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ message: 'Phone number is required.' });
        }

        const customer = await Customer.findOne({ phone }).lean();

        if (!customer) {
            return res.status(404).json({ message: 'No customer found with this phone number. Please register or contact support.' });
        }

        res.json({
            ...customer,
            hasPassword: !!customer.password
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const setCustomerPassword = async (req, res) => {
    try {
        const { phone, password } = req.body;

        if (!phone || !password) {
            return res.status(400).json({ message: 'Phone and password are required.' });
        }

        const customer = await Customer.findOne({ phone });

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found.' });
        }

        if (customer.password) {
            return res.status(400).json({ message: 'An account with this phone number already has a password.' });
        }

        const salt = await bcrypt.genSalt(10);
        customer.password = await bcrypt.hash(password, salt);
        await customer.save();

        res.status(200).json({ message: 'Password set successfully. You can now log in.' });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteCustomers = async (req, res) => {
    const { ids } = req.body;

    try {
        await Customer.deleteMany({ _id: { $in: ids } });
        res.json({ message: 'Selected customers deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
