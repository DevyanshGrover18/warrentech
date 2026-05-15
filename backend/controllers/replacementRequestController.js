import ReplacementRequest from '../models/ReplacementRequest.js';
import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import Technician from '../models/Technician.js';
import mongoose from 'mongoose';
import { getExecutiveScope } from '../utils/executiveScope.js';

export const createReplacementRequest = async (req, res) => {
    try {
        const { productId, complaintDescription, preferredVisitDate } = req.body;
        const customerId = req.user.id; // This is the Customer ID from the token

        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ message: 'Customer profile not found.' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const existingRequest = await ReplacementRequest.findOne({ 
            product: productId,
            status: { $in: ['Pending', 'Approved', 'Assigned', 'In Progress', 'Replacement Required'] } 
        });

        if (existingRequest) {
            return res.status(400).json({ message: 'An active replacement request for this product already exists.' });
        }

        const mediaUrl = req.file ? req.file.path.replace(/\\/g, "/") : null;

        const replacementRequest = new ReplacementRequest({
            product: productId,
            customer: customerId, // Store the Customer's ID
            complaintDescription,
            preferredVisitDate: preferredVisitDate ? new Date(preferredVisitDate) : null,
            mediaUrl,
        });

        await replacementRequest.save();

        product.status = 'Replacement Requested';
        await product.save();

        res.status(201).json(replacementRequest);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

import Customer from '../models/Customer.js';

const getReplacementScopeMatch = async (user) => {
    const scope = await getExecutiveScope(user);

    if (!scope.isExecutive) {
        return null;
    }

    return {
        'productInfo.distributor': {
            $in: scope.distributorIds.map(id => new mongoose.Types.ObjectId(id))
        }
    };
};

export const getReplacementRequests = async (req, res) => {
    try {
        const replacementScopeMatch = await getReplacementScopeMatch(req.user);
        let requests;

        if (replacementScopeMatch) {
            requests = await ReplacementRequest.aggregate([
                {
                    $lookup: {
                        from: 'products',
                        localField: 'product',
                        foreignField: '_id',
                        as: 'productInfo'
                    }
                },
                { $unwind: '$productInfo' },
                { $match: replacementScopeMatch },
                { $project: { _id: 1 } }
            ]);

            requests = await ReplacementRequest.find({
                _id: { $in: requests.map(request => request._id) }
            })
                .populate({
                    path: 'product',
                    populate: {
                        path: 'model',
                    },
                })
                .populate('customer')
                .lean();
        } else {
            requests = await ReplacementRequest.find()
                .populate({
                    path: 'product',
                    populate: {
                        path: 'model',
                    },
                })
                .populate('customer')
                .lean();
        }

        for (let i = 0; i < requests.length; i++) {
            const request = requests[i];

            if (request.assignedTechnician) {
                const technician = await Technician.findOne({ user: request.assignedTechnician });
                if (technician) {
                    request.technician = technician;
                }
            }

            // --- Warranty Calculation ---
            const sale = await Sale.findOne({ product: request.product?._id }).populate('distributor').populate('dealer');
            if (sale && sale.saleDate && request.product?.model) {
                const model = request.product.model;
                const seller = sale.distributor || sale.dealer;
                let warrantyInfo = null;

                if (model.warranty && Array.isArray(model.warranty) && model.warranty.length > 0) {
                    const candidate = (seller && model.warranty.find(w => w.state === seller.state && w.city === seller.city))
                        || (seller && model.warranty.find(w => w.state === seller.state))
                        || model.warranty[0];

                    if (candidate) {
                        const months = candidate.durationType === 'Years' ? candidate.duration * 12 : candidate.duration;
                        const soldAt = new Date(sale.saleDate);
                        const expiry = new Date(soldAt);
                        expiry.setMonth(expiry.getMonth() + months);
                        const now = new Date();
                        const inWarranty = expiry >= now;
                        const daysLeft = inWarranty ? Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)) : 0;

                        warrantyInfo = {
                            duration: candidate.duration,
                            durationType: candidate.durationType,
                            state: candidate.state,
                            city: candidate.city,
                            expiryDate: expiry,
                            inWarranty,
                            daysLeft
                        };
                    }
                }
                request.warrantyInfo = warrantyInfo;
            } else {
                request.warrantyInfo = null;
            }
            // --- End Warranty Calculation ---
        }

        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getReplacementRequestsByCustomer = async (req, res) => {
    try {
        // When a customer is logged in, req.user.id is their Customer ID.
        const customerId = req.user.id;

        if (!customerId) {
            return res.status(400).json({ message: 'Customer ID not found in token.' });
        }

        const requests = await ReplacementRequest.find({ customer: customerId })
            .populate({
                path: 'product',
                populate: {
                    path: 'model',
                },
            })
            .populate('technician'); // This might need to be populated with more user details if needed
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateReplacementRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, assignedTechnician } = req.body;
        const scope = await getExecutiveScope(req.user);

        const request = await ReplacementRequest.findById(id);

        if (!request) {
            return res.status(404).json({ message: 'Replacement request not found' });
        }

        if (scope.isExecutive) {
            const product = await Product.findById(request.product).select('distributor').lean();
            if (!product || !scope.distributorIds.includes(product.distributor?.toString())) {
                return res.status(403).json({ message: 'Access denied' });
            }
        }

        if (assignedTechnician) {
            request.status = 'Assigned';
            request.assignedTechnician = assignedTechnician;

            const technician = await Technician.findOne({ user: assignedTechnician });
            if (technician) {
                const now = new Date();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const year = String(now.getFullYear()).slice(-2);
                
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

                const monthlyRequestCount = await ReplacementRequest.countDocuments({
                    assignedTechnician: assignedTechnician,
                    createdAt: { $gte: startOfMonth, $lte: endOfMonth },
                });

                const serialNumber = 10001 + monthlyRequestCount;
                const jcNumber = `JC${month}${year}${technician.technicianCode}${serialNumber}`;

                request.jcNumber = jcNumber;

                technician.assignedRequests.push(request._id);
                await technician.save();
            }

        } else {
            request.status = status;
        }
        
        await request.save();

        res.json(request);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const addDiagnosis = async (req, res) => {
    try {
        const { id } = req.params;
        const { diagnosisNotes, serviceOutcome, repairedParts } = req.body;

        const request = await ReplacementRequest.findById(id);
        if (!request) {
            return res.status(404).json({ message: 'Replacement request not found' });
        }

        // Update common fields
        request.diagnosisNotes = diagnosisNotes;
        request.serviceOutcome = serviceOutcome;

        if (serviceOutcome === 'Repaired') {
            request.status = 'Completed';
            if (repairedParts) {
                request.repairedParts = JSON.parse(repairedParts);
            }
            if (req.files?.beforeImage) {
                request.beforeImagePath = req.files.beforeImage[0].path.replace(/\\/g, "/");
            }
            if (req.files?.afterImage) {
                request.afterImagePath = req.files.afterImage[0].path.replace(/\\/g, "/");
            }
        } else if (serviceOutcome === 'Replacement Required') {
            request.status = 'Replacement Required';
            request.repairedParts = []; // Clear any parts if this outcome is chosen
        }

        const updatedRequest = await request.save();
        res.json(updatedRequest);

    } catch (error) {
        console.error('Error adding diagnosis:', error);
        res.status(500).json({ message: error.message });
    }
};
