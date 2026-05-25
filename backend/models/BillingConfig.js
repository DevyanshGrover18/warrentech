import mongoose from 'mongoose';

const billingConfigSchema = new mongoose.Schema({
    serviceCharge: {
        type: Number,
        default: 0
    },
    replacementCharge: {
        type: Number,
        default: 0
    },
    termsAndConditionsUrl: {
        type: String,
        default: ''
    },
    outOfWarrantyServiceCharge: {
        type: Number,
        default: 0
    },
    outOfWarrantyReplacementCharge: {
        type: Number,
        default: 0
    },
    outOfWarrantyTermsAndConditionsUrl: {
        type: String,
        default: ''
    },
    saleEditDeadlineValue: {
        type: Number,
        default: 24
    },
    saleEditDeadlineUnit: {
        type: String,
        enum: ['hrs', 'days'],
        default: 'hrs'
    }
}, { timestamps: true });

export default mongoose.model('BillingConfig', billingConfigSchema);
