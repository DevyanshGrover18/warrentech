import mongoose from 'mongoose';

const walletPayoutRequestSchema = new mongoose.Schema({
    entityType: {
        type: String,
        enum: ['distributor', 'dealer'],
        required: true,
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    reason: {
        type: String,
        trim: true,
        default: '',
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
        index: true,
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    approvedAt: {
        type: Date,
        default: null,
    },
    rejectedAt: {
        type: Date,
        default: null,
    },
    rejectionReason: {
        type: String,
        trim: true,
        default: '',
    },
    paymentProofPath: {
        type: String,
        trim: true,
        default: '',
    },
    walletTransactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WalletTransaction',
        default: null,
    },
}, {
    timestamps: true,
});

walletPayoutRequestSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export default mongoose.model('WalletPayoutRequest', walletPayoutRequestSchema);
