import asyncHandler from 'express-async-handler';
import Product from '../models/Product.js';
import User from '../models/User.js';
import DealerSubDealerProduct from '../models/DealerSubDealerProduct.js';
import DistributorDealerProduct from '../models/DistributorDealerProduct.js';

const assignProductToSubDealerBySerial = asyncHandler(async (req, res) => {
    const { serialNumber } = req.body;
    let { subDealerId } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId).populate('dealer').populate('subDealer');
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    let dealerId;
    if (req.user.role === 'dealer') {
        dealerId = user.dealer?._id;
    } else if (req.user.role === 'sub_dealer') {
        dealerId = user.subDealer?.dealer;
        subDealerId = user.subDealer?._id;
    }

    if (!dealerId) {
        res.status(401);
        throw new Error('User is not associated with a dealer or sub-dealer');
    }

    if (!serialNumber) {
        res.status(400);
        throw new Error('Serial number is required');
    }

    if (!subDealerId) {
        res.status(400);
        throw new Error('Sub Dealer ID is required');
    }

    const product = await Product.findOne({ serialNumber });

    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }

    // Check if product is assigned to this dealer
    const dealerAssignment = await DistributorDealerProduct.findOne({ 
        product: product._id, 
        dealer: dealerId 
    });

    if (!dealerAssignment) {
        res.status(400);
        throw new Error('Product is not assigned to your parent dealership');
    }

    // Check if product is already assigned to a sub dealer
    const existingAssignment = await DealerSubDealerProduct.findOne({ product: product._id });
    if (existingAssignment) {
        res.status(400);
        throw new Error('Product already assigned to a sub dealer');
    }

    await DealerSubDealerProduct.create({
        dealer: dealerId,
        subDealer: subDealerId,
        product: product._id
    });

    res.json({ message: 'Product assigned to sub dealer successfully' });
});

const getSubDealerProducts = asyncHandler(async (req, res) => {
    let subDealerId;
    
    console.log('getSubDealerProducts - req.user:', req.user);
    console.log('getSubDealerProducts - req.params:', req.params);

    if (req.user.role === 'sub_dealer') {
        subDealerId = req.user.subDealer;
    } else {
        subDealerId = req.params.subDealerId;
    }

    console.log('getSubDealerProducts - resolved subDealerId:', subDealerId);

    if (!subDealerId) {
        res.status(400);
        throw new Error('Sub Dealer ID is required');
    }

    const products = await DealerSubDealerProduct.find({ subDealer: subDealerId })
        .populate({
            path: 'product',
            populate: {
                path: 'model'
            }
        })
        .populate('dealer');
            
    res.json(products);
});

const bulkAssignProductsToSubDealer = asyncHandler(async (req, res) => {
    const { productIds, subDealerId } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId).populate('dealer').populate('subDealer');
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    let dealerId;
    if (req.user.role === 'dealer') {
        dealerId = user.dealer?._id;
    } else if (req.user.role === 'sub_dealer') {
        dealerId = user.subDealer?.dealer;
    }

    if (!dealerId) {
        res.status(401);
        throw new Error('User is not associated with a dealer');
    }

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        res.status(400);
        throw new Error('Product IDs are required');
    }

    if (!subDealerId) {
        res.status(400);
        throw new Error('Sub Dealer ID is required');
    }

    // Verify all products belong to the dealer
    const assignments = await DistributorDealerProduct.find({ 
        product: { $in: productIds }, 
        dealer: dealerId 
    });

    if (assignments.length !== productIds.length) {
        res.status(400);
        throw new Error('Some products are not assigned to your dealership');
    }

    // Verify products are not already assigned to sub-dealers
    const existingAssignments = await DealerSubDealerProduct.find({ product: { $in: productIds } });
    if (existingAssignments.length > 0) {
        res.status(400);
        throw new Error('Some products are already assigned to a sub dealer');
    }

    const newAssignments = productIds.map(productId => ({
        dealer: dealerId,
        subDealer: subDealerId,
        product: productId
    }));

    await DealerSubDealerProduct.insertMany(newAssignments);

    res.json({ message: 'Products assigned to sub dealer successfully' });
});

export { assignProductToSubDealerBySerial, getSubDealerProducts, bulkAssignProductsToSubDealer };
