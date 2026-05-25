import BillingConfig from '../models/BillingConfig.js';
import asyncHandler from 'express-async-handler';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure Multer for PDF uploads
const createPdfUpload = (fieldName) => {
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadPath = 'public/uploads/tnc';
            fs.mkdirSync(uploadPath, { recursive: true });
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            cb(null, `${fieldName}-${Date.now()}${path.extname(file.originalname)}`);
        },
    });

    return multer({
        storage: storage,
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
        fileFilter: (req, file, cb) => {
            if (file.mimetype === 'application/pdf') {
                cb(null, true);
            } else {
                cb(new Error('Only PDF files are allowed!'), false);
            }
        },
    }).single(fieldName);
};

const uploadInWarrantyTnc = createPdfUpload('termsAndConditions');
const uploadOutOfWarrantyTnc = createPdfUpload('outOfWarrantyTermsAndConditions');


// @desc    Get current billing configuration
// @route   GET /api/billing-config
// @access  Admin
export const getBillingConfig = asyncHandler(async (req, res) => {
    let config = await BillingConfig.findOne();

    if (!config) {
        // Create a default config if none exists
        config = await BillingConfig.create({});
    }

    res.json(config);
});

// @desc    Update In-Warranty billing configuration
// @route   PUT /api/billing-config/in-warranty
// @access  Admin
export const updateInWarrantyConfig = asyncHandler(async (req, res) => {
    uploadInWarrantyTnc(req, res, async (err) => {
        if (err) {
            res.status(400).json({ message: err.message });
            return;
        }

        let config = await BillingConfig.findOne();
        if (!config) config = await BillingConfig.create({});

        config.serviceCharge = req.body.serviceCharge || config.serviceCharge;
        config.replacementCharge = req.body.replacementCharge || config.replacementCharge;

        if (req.file) {
            if (config.termsAndConditionsUrl) {
                const oldFilePath = path.join(process.cwd(), config.termsAndConditionsUrl);
                if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
            }
            config.termsAndConditionsUrl = req.file.path.replace(/\\/g, "/");
        } else if (req.body.clearPdf === 'true') {
            if (config.termsAndConditionsUrl) {
                const oldFilePath = path.join(process.cwd(), config.termsAndConditionsUrl);
                if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
            }
            config.termsAndConditionsUrl = '';
        }

        const updatedConfig = await config.save();
        res.json(updatedConfig);
    });
});

// @desc    Update Out-of-Warranty billing configuration
// @route   PUT /api/billing-config/out-of-warranty
// @access  Admin
export const updateOutOfWarrantyConfig = asyncHandler(async (req, res) => {
    uploadOutOfWarrantyTnc(req, res, async (err) => {
        if (err) {
            res.status(400).json({ message: err.message });
            return;
        }

        let config = await BillingConfig.findOne();
        if (!config) config = await BillingConfig.create({});

        config.outOfWarrantyServiceCharge = req.body.outOfWarrantyServiceCharge || config.outOfWarrantyServiceCharge;
        config.outOfWarrantyReplacementCharge = req.body.outOfWarrantyReplacementCharge || config.outOfWarrantyReplacementCharge;

        if (req.file) {
            if (config.outOfWarrantyTermsAndConditionsUrl) {
                const oldFilePath = path.join(process.cwd(), config.outOfWarrantyTermsAndConditionsUrl);
                if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
            }
            config.outOfWarrantyTermsAndConditionsUrl = req.file.path.replace(/\\/g, "/");
        } else if (req.body.clearPdf === 'true') {
            if (config.outOfWarrantyTermsAndConditionsUrl) {
                const oldFilePath = path.join(process.cwd(), config.outOfWarrantyTermsAndConditionsUrl);
                if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
            }
            config.outOfWarrantyTermsAndConditionsUrl = '';
        }

        const updatedConfig = await config.save();
        res.json(updatedConfig);
    });
});

// @desc    Update Sale Edit Deadline configuration
// @route   PUT /api/billing-config/sale-edit-deadline
// @access  Admin
export const updateSaleEditDeadline = asyncHandler(async (req, res) => {
    let config = await BillingConfig.findOne();
    if (!config) config = await BillingConfig.create({});

    config.saleEditDeadlineValue = Number(req.body.saleEditDeadlineValue) || config.saleEditDeadlineValue;
    config.saleEditDeadlineUnit = req.body.saleEditDeadlineUnit || config.saleEditDeadlineUnit;

    const updatedConfig = await config.save();
    res.json(updatedConfig);
});
