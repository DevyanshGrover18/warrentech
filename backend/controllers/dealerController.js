import Dealer from '../models/Dealer.js';
import Distributor from '../models/Distributor.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import { getExecutiveScope } from '../utils/executiveScope.js';

export const getDealers = async (req, res) => {
    try {
        const { search } = req.query;
        const scope = await getExecutiveScope(req.user);
        let matchQuery = {};

        if (search) {
            matchQuery = {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { address: { $regex: search, $options: 'i' } },
                    { state: { $regex: search, $options: 'i' } },
                    { city: { $regex: search, $options: 'i' } }
                ]
            };
        }

        if (scope.isExecutive) {
            matchQuery = {
                ...matchQuery,
                _id: { $in: scope.dealerObjectIds }
            };
        }

        const dealers = await Dealer.aggregate([
            { $match: matchQuery },
            {
                $lookup: {
                    from: 'distributordealerproducts',
                    localField: '_id',
                    foreignField: 'dealer',
                    as: 'assignedProducts'
                }
            },
            {
                $addFields: {
                    productCount: { $size: '$assignedProducts' }
                }
            },
            {
                $project: {
                    assignedProducts: 0,
                    password: 0
                }
            },
            {
                $lookup: {
                    from: 'distributors',
                    localField: 'distributor',
                    foreignField: '_id',
                    as: 'distributor'
                }
            },
            {
                $unwind: {
                    path: '$distributor',
                    preserveNullAndEmptyArrays: true
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        res.json(dealers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createDealer = async (req, res) => {
    try {
        const { username, password, ...dealerData } = req.body;

        // Check if username already exists
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: 'Username already taken' });
        }

        // Find the latest dealer to get the last dealer ID
        const latestDealer = await Dealer.findOne().sort({ dealerId: -1 });
        
        // Generate new dealer ID
        let newDealerId;
        if (latestDealer) {
            const lastNumber = parseInt(latestDealer.dealerId.replace('DEAL', ''));
            newDealerId = `DEAL${String(lastNumber + 1).padStart(5, '0')}`;
        } else {
            newDealerId = 'DEAL00001';
        }

        const dealer = new Dealer({
            ...dealerData,
            username,
            password,
            dealerId: newDealerId
        });

        const createdDealer = await dealer.save();

        // Create a corresponding User entry for authentication
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({
            username,
            password: hashedPassword,
            role: 'dealer',
            dealer: createdDealer._id
        });

        if (req.body.distributor) {
            await Distributor.findByIdAndUpdate(
                req.body.distributor,
                { $push: { dealers: createdDealer._id } },
                { new: true, useFindAndModify: false }
            );
        }

        const dealerResponse = createdDealer.toObject();
        delete dealerResponse.password;
        res.status(201).json(dealerResponse);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const updateDealer = async (req, res) => {
    try {
        const dealer = await Dealer.findById(req.params.id);
        if (!dealer) {
            return res.status(404).json({ message: 'Dealer not found' });
        }

        // Exclude username and password from update data
        const { username, password, ...updateData } = req.body;
        
        // Only update username if it's provided and different
        if (username && username !== dealer.username) {
            // Check if new username already exists
            const userExists = await User.findOne({ username, _id: { $ne: dealer._id } });
            if (userExists) {
                return res.status(400).json({ message: 'Username already taken' });
            }
            updateData.username = username;
            
            // Update username in User model as well
            await User.findOneAndUpdate(
                { dealer: dealer._id },
                { username: username }
            );
        }
        
        // Only update password if it's provided
        if (password) {
            updateData.password = password;
            
            // Update password in User model as well
            const hashedPassword = await bcrypt.hash(password, 10);
            await User.findOneAndUpdate(
                { dealer: dealer._id },
                { password: hashedPassword }
            );
        }

        const updatedDealer = await Dealer.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        // If the distributor is changed, update the old and new distributors
        if (req.body.distributor && dealer.distributor?.toString() !== req.body.distributor) {
            // Remove dealer from old distributor
            if (dealer.distributor) {
                await Distributor.findByIdAndUpdate(
                    dealer.distributor,
                    { $pull: { dealers: dealer._id } }
                );
            }

            // Add dealer to new distributor
            await Distributor.findByIdAndUpdate(
                req.body.distributor,
                { $push: { dealers: dealer._id } }
            );
        }

        res.json(updatedDealer);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteDealer = async (req, res) => {
    try {
        const dealer = await Dealer.findById(req.params.id);
        if (!dealer) {
            return res.status(404).json({ message: 'Dealer not found' });
        }

        // Remove dealer from associated distributor's dealers array
        if (dealer.distributor) {
            await Distributor.findByIdAndUpdate(
                dealer.distributor,
                { $pull: { dealers: dealer._id } }
            );
        }

        await dealer.deleteOne();
        res.json({ message: 'Dealer removed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteMultipleDealers = async (req, res) => {
    try {
        const { dealerIds } = req.body;
        if (!dealerIds || dealerIds.length === 0) {
            return res.status(400).json({ message: 'No dealer IDs provided' });
        }

        // Find all dealers to be deleted to get their distributor IDs
        const dealers = await Dealer.find({ _id: { $in: dealerIds } });
        if (dealers.length === 0) {
            return res.status(404).json({ message: 'No dealers found' });
        }

        // Group dealers by distributor
        const distributorMap = dealers.reduce((map, dealer) => {
            if (dealer.distributor) {
                const distributorId = dealer.distributor.toString();
                if (!map[distributorId]) {
                    map[distributorId] = [];
                }
                map[distributorId].push(dealer._id);
            }
            return map;
        }, {});

        // Remove dealers from their respective distributors
        for (const distributorId in distributorMap) {
            await Distributor.findByIdAndUpdate(
                distributorId,
                { $pull: { dealers: { $in: distributorMap[distributorId] } } }
            );
        }

        await Dealer.deleteMany({ _id: { $in: dealerIds } });
        res.json({ message: 'Dealers deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
