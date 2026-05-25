import mongoose from 'mongoose';

const walletTransactionSchema = new mongoose.Schema({
    entityType: {
        type: String,
        enum: ['distributor', 'dealer'],
        required: true,
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    type: {
        type: String,
        enum: ['credit', 'debit'],
        required: true,
    },
    source: {
        type: String,
        enum: ['sale_incentive', 'manual_adjustment', 'wallet_payout'],
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    saleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sale',
        default: null,
    },
    notes: {
        type: String,
        trim: true,
        default: '',
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
}, {
    timestamps: true,
});

walletTransactionSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export default mongoose.model('WalletTransaction', walletTransactionSchema);
