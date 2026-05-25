import DistributorDealerProduct from '../models/DistributorDealerProduct.js';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import { isSaleFormComplete, recomputeSaleIncentive } from '../utils/incentiveUtils.js';

export const getDealerSales = async (req, res) => {
    try {
        const { distributorId } = req.params;

        const sales = await DistributorDealerProduct.find({
            distributor: distributorId
        })
        .populate({
            path: 'product',
            populate: {
                path: 'model'
            }
        })
        .populate('dealer', 'name');

        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getCustomerSales = async (req, res) => {
    try {
        const { distributorId } = req.params;

        const sales = await Sale.find({
            distributor: distributorId
        })
        .populate('product')
        .populate('distributor', 'name');

        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const sellToCustomer = async (req, res) => {
    try {
        const { productIds, customerName, customerPhone, customerAddress, customerEmail, customerState, customerCity, plumberName, plumberPhone } = req.body;

        if (!req.user || req.user.role !== 'distributor') {
            return res.status(403).json({ message: 'Only distributors can create these sales.' });
        }

        if (!productIds || productIds.length === 0 || !customerName || !customerPhone) {
            return res.status(400).json({ message: 'Missing required sale details.' });
        }

        // Find or create customer
        let customer = await Customer.findOne({ phone: customerPhone });
        if (!customer) {
            customer = await Customer.create({
                name: customerName,
                phone: customerPhone,
                address: customerAddress,
                email: customerEmail,
                state: customerState,
                city: customerCity
            });
        }

        const salesRecords = [];
        for (const productId of productIds) {
            const product = await Product.findById(productId);

            if (!product) {
                console.warn(`Product with ID ${productId} not found.`);
                continue;
            }

            if (product.sold) {
                console.warn(`Product with ID ${productId} is already sold.`);
                continue;
            }

            // Create Sale record
            const sale = await Sale.create({
                product: productId,
                distributor: req.user.distributor,
                customerName,
                customerPhone,
                customerAddress,
                customerEmail,
                customerState,
                customerCity,
                plumberName,
                plumberPhone,
                customer: customer._id,
                saleDate: new Date(),
                createdByRole: req.user.role,
                createdByUserId: req.user.id,
                createdByEntityType: 'distributor',
                createdByEntityId: req.user.distributor,
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

            await recomputeSaleIncentive(sale, {
                editedByRole: req.user.role,
                editedByUserId: req.user.id,
            });
            await sale.save();
            salesRecords.push(sale);

            // Update Product status
            product.sold = true;
            product.saleDate = new Date();
            await product.save();
        }

        if (salesRecords.length === 0) {
            return res.status(400).json({ message: 'No products were sold.' });
        }

        res.status(200).json({ message: `${salesRecords.length} products sold successfully.`, sales: salesRecords });

    } catch (error) {
        console.error('Error selling to customer:', error);
        res.status(500).json({ message: error.message });
    }
};
