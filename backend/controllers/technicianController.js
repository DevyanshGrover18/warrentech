import ReplacementRequest from '../models/ReplacementRequest.js';
import Technician from '../models/Technician.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import { getExecutiveScope } from '../utils/executiveScope.js';

export const createTechnician = async (req, res) => {
    const { name, phone, address, state, city, username, password, technicianCode } = req.body;

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const existingTechnician = await Technician.findOne({ phone });
        if (existingTechnician) {
            return res.status(400).json({ message: 'Phone number already exists' });
        }

        const existingCode = await Technician.findOne({ technicianCode });
        if (existingCode) {
            return res.status(400).json({ message: 'Technician code already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username,
            password: hashedPassword,
            role: 'technician',
        });

        const savedUser = await newUser.save();

        const newTechnician = new Technician({
            user: savedUser._id,
            technicianCode,
            name,
            phone,
            address,
            state,
            city,
        });

        const savedTechnician = await newTechnician.save();

        const populatedTechnician = await Technician.findById(savedTechnician._id).populate('user', 'username');

        res.status(201).json(populatedTechnician);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const checkTechnicianCode = async (req, res) => {
    try {
        const { code } = req.params;
        const existingTechnician = await Technician.findOne({ technicianCode: code });
        res.json({ isTaken: !!existingTechnician });
    } catch (error) {
        res.status(500).json({ message: 'Error checking technician code' });
    }
};

export const getTechnicians = async (req, res) => {
    try {
        const { state, city } = req.query;
        const scope = await getExecutiveScope(req.user);
        const filter = {};

        if (state) {
            filter.state = state;
        }
        if (city) {
            filter.city = city;
        }

        if (scope.isExecutive && scope.distributorIds.length === 0) {
            return res.json([]);
        }

        const technicians = await Technician.find(filter)
            .populate('user', 'username')
            .populate({
                path: 'assignedRequests',
                populate: [
                    { 
                        path: 'product',
                        populate: {
                            path: 'model'
                        }
                    },
                    { path: 'customer' }
                ]
            });
        res.json(technicians);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateTechnician = async (req, res) => {
    const { id } = req.params;
    const { name, phone, address, state, city, username, password } = req.body;

    try {
        const technician = await Technician.findById(id);

        if (!technician) {
            return res.status(404).json({ message: 'Technician not found' });
        }

        const user = await User.findById(technician.user);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (username) {
            user.username = username;
        }

        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save();

        technician.name = name || technician.name;
        technician.phone = phone || technician.phone;
        technician.address = address || technician.address;
        technician.state = state || technician.state;
        technician.city = city || technician.city;

        const updatedTechnician = await technician.save();
        res.json(updatedTechnician);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteTechnician = async (req, res) => {
    const { id } = req.params;

    try {
        const technician = await Technician.findById(id);

        if (!technician) {
            return res.status(404).json({ message: 'Technician not found' });
        }

        await User.findByIdAndDelete(technician.user);
        await Technician.findByIdAndDelete(id);

        res.json({ message: 'Technician deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteTechnicians = async (req, res) => {
    const { ids } = req.body;

    try {
        const technicians = await Technician.find({ _id: { $in: ids } });

        if (!technicians || technicians.length === 0) {
            return res.status(404).json({ message: 'No technicians found for the given IDs' });
        }

        const userIds = technicians.map(technician => technician.user);
        await User.deleteMany({ _id: { $in: userIds } });
        await Technician.deleteMany({ _id: { $in: ids } });

        res.json({ message: 'Selected technicians deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

import Sale from '../models/Sale.js';

export const getAssignedRequests = async (req, res) => {
    try {
        const requests = await ReplacementRequest.find({ assignedTechnician: req.user.id })
            .populate({
                path: 'product',
                populate: [
                    { path: 'model', populate: { path: 'category' } },
                    { path: 'category' }
                ]
            })
            .populate('customer', 'name phone email address city state')
            .lean();

        for (let i = 0; i < requests.length; i++) {
            const request = requests[i];
            
            // --- Warranty Calculation ---
            const sale = await Sale.findOne({ product: request.product?._id }).populate('distributor').populate('dealer');
            if (sale && request.product?.model) {
                const model = request.product.model;
                const seller = sale.distributor || sale.dealer;
                let warrantyInfo = null;

                if (model.warranty && Array.isArray(model.warranty) && model.warranty.length > 0) {
                    const candidate = (seller && model.warranty.find(w => w.state === seller.state && w.city === seller.city))
                        || (seller && model.warranty.find(w => w.state === seller.state))
                        || model.warranty[0];

                    if (candidate) {
                        const months = candidate.durationType === 'Years' ? candidate.duration * 12 : candidate.duration;
                        const soldAt = sale.saleDate ? new Date(sale.saleDate) : new Date(sale.createdAt);
                        const expiry = new Date(soldAt);
                        expiry.setMonth(expiry.getMonth() + months);
                        const now = new Date();
                        const inWarranty = expiry >= now;
                        const daysLeft = inWarranty ? Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)) : 0;

                        warrantyInfo = {
                            ...candidate,
                            expiryDate: expiry,
                            inWarranty,
                            daysLeft
                        };
                    }
                }
                request.warrantyInfo = warrantyInfo;
            }
            // --- End Warranty Calculation ---
        }

        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
