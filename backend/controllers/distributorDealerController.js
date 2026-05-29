import DistributorDealerProduct from '../models/DistributorDealerProduct.js';
import DealerSubDealerProduct from '../models/DealerSubDealerProduct.js';

export const assignProductToDealer = async (req, res) => {
    try {
        const { distributorId, dealerId, productId } = req.body;

        const assignment = new DistributorDealerProduct({
            distributor: distributorId,
            dealer: dealerId,
            product: productId
        });

        const createdAssignment = await assignment.save();
        res.status(201).json(createdAssignment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getDealerProducts = async (req, res) => {
    try {
        const { dealerId } = req.params;

        const subDealerAssignments = await DealerSubDealerProduct.find({ dealer: dealerId });
        const assignedProductIds = subDealerAssignments.map(a => a.product);

        const products = await DistributorDealerProduct.find({ 
            dealer: dealerId,
            product: { $nin: assignedProductIds }
        })
            .populate({
                path: 'product',
                populate: {
                    path: 'model'
                }
            })
            .populate('distributor');
            
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getDistributorAssignedProducts = async (req, res) => {
    try {
        const distributorId = req.user.distributor;
        if (!distributorId) {
            return res.status(400).json({ message: 'Distributor ID is required' });
        }

        const products = await DistributorDealerProduct.find({ distributor: distributorId })
            .populate({
                path: 'product',
                populate: {
                    path: 'model'
                }
            })
            .populate('dealer')
            .sort({ assignedAt: -1, createdAt: -1 });
            
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};