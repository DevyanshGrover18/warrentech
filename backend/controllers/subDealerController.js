import SubDealer from '../models/SubDealer.js';
import Dealer from '../models/Dealer.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { getExecutiveScope } from '../utils/executiveScope.js';
import { buildPaginatedAggregationResponse, parsePaginatedListQuery } from '../utils/paginatedList.js';

export const getSubDealers = async (req, res) => {
    try {
        const { search, state, dealerId, dealerIds } = req.query;
        const scope = await getExecutiveScope(req.user);
        const listQuery = parsePaginatedListQuery(req.query, {
            defaultLimit: 25,
            maxLimit: 100,
            defaultSortBy: 'createdAt',
            defaultSortOrder: 'desc',
        });
        const sortableFields = new Set(['createdAt', 'name', 'subDealerId', 'city', 'state', 'productCount']);
        const sortField = sortableFields.has(listQuery.sortBy) ? listQuery.sortBy : 'createdAt';
        const sortStage = { $sort: { [sortField]: listQuery.sortOrder === 'asc' ? 1 : -1 } };
        let matchQuery = {};

        if (search) {
            matchQuery = {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { address: { $regex: search, $options: 'i' } },
                    { state: { $regex: search, $options: 'i' } },
                    { city: { $regex: search, $options: 'i' } },
                    { subDealerId: { $regex: search, $options: 'i' } },
                ]
            };
        }

        if (state && state !== 'all') {
            matchQuery.state = state;
        }

        if (dealerId && dealerId !== 'all') {
            if (mongoose.Types.ObjectId.isValid(dealerId)) {
                matchQuery.dealer = new mongoose.Types.ObjectId(dealerId);
            }
        }

        if (dealerIds) {
            const ids = dealerIds.split(',').filter(id => mongoose.Types.ObjectId.isValid(id));
            if (ids.length > 0) {
                matchQuery.dealer = { $in: ids.map(id => new mongoose.Types.ObjectId(id)) };
            }
        }

        // If current user is a dealer, restrict to their sub dealers
        if (req.user.role === 'dealer') {
            matchQuery.dealer = new mongoose.Types.ObjectId(req.user.dealer);
        }

        if (scope.isExecutive) {
            matchQuery = {
                ...matchQuery,
                _id: { $in: scope.subDealerObjectIds }
            };
        }

        const basePipeline = [
            { $match: matchQuery },
            {
                $lookup: {
                    from: 'dealersubdealerproducts',
                    localField: '_id',
                    foreignField: 'subDealer',
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
                    from: 'dealers',
                    localField: 'dealer',
                    foreignField: '_id',
                    as: 'dealer'
                }
            },
            {
                $unwind: {
                    path: '$dealer',
                    preserveNullAndEmptyArrays: true
                }
            },
            sortStage
        ];

        if (listQuery.paginate) {
            const paginatedResult = await SubDealer.aggregate([
                ...basePipeline,
                {
                    $facet: {
                        items: [
                            { $skip: listQuery.skip },
                            { $limit: listQuery.limit },
                        ],
                        totalCount: [
                            { $count: 'count' },
                        ],
                    },
                },
            ]);

            return res.json(buildPaginatedAggregationResponse(paginatedResult, {
                page: listQuery.page,
                limit: listQuery.limit,
                appliedFilters: {
                    search: search || '',
                    state: state || 'all',
                    dealerId: dealerId || 'all',
                    sortBy: sortField,
                    sortOrder: listQuery.sortOrder,
                },
            }));
        }

        const subDealers = await SubDealer.aggregate(basePipeline);

        res.json(subDealers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createSubDealer = async (req, res) => {
    try {
        const { username, password, ...subDealerData } = req.body;

        // Check if username already exists
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: 'Username already taken' });
        }

        // Find the latest sub dealer to get the last sub dealer ID
        const latestSubDealer = await SubDealer.findOne().sort({ subDealerId: -1 });
        
        // Generate new sub dealer ID
        let newSubDealerId;
        if (latestSubDealer) {
            const lastNumber = parseInt(latestSubDealer.subDealerId.replace('SUBD', ''));
            newSubDealerId = `SUBD${String(lastNumber + 1).padStart(5, '0')}`;
        } else {
            newSubDealerId = 'SUBD00001';
        }

        const subDealer = new SubDealer({
            ...subDealerData,
            username,
            password,
            subDealerId: newSubDealerId
        });

        const createdSubDealer = await subDealer.save();

        // Create a corresponding User entry for authentication
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({
            username,
            password: hashedPassword,
            role: 'sub_dealer',
            subDealer: createdSubDealer._id
        });

        const subDealerResponse = createdSubDealer.toObject();
        delete subDealerResponse.password;
        res.status(201).json(subDealerResponse);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const updateSubDealer = async (req, res) => {
    try {
        const subDealer = await SubDealer.findById(req.params.id);
        if (!subDealer) {
            return res.status(404).json({ message: 'Sub Dealer not found' });
        }

        const { username, password, ...updateData } = req.body;
        
        if (username && username !== subDealer.username) {
            const userExists = await User.findOne({ username, _id: { $ne: subDealer._id } });
            if (userExists) {
                return res.status(400).json({ message: 'Username already taken' });
            }
            updateData.username = username;
            
            await User.findOneAndUpdate(
                { subDealer: subDealer._id },
                { username: username }
            );
        }
        
        if (password) {
            updateData.password = password;
            const hashedPassword = await bcrypt.hash(password, 10);
            await User.findOneAndUpdate(
                { subDealer: subDealer._id },
                { password: hashedPassword }
            );
        }

        const updatedSubDealer = await SubDealer.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        res.json(updatedSubDealer);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteSubDealer = async (req, res) => {
    try {
        const subDealer = await SubDealer.findById(req.params.id);
        if (!subDealer) {
            return res.status(404).json({ message: 'Sub Dealer not found' });
        }

        await User.deleteOne({ subDealer: subDealer._id });
        await subDealer.deleteOne();
        res.json({ message: 'Sub Dealer removed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
