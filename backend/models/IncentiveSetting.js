import mongoose from 'mongoose';

const incentiveSettingSchema = new mongoose.Schema({
    distributorPerSaleIncentive: {
        type: Number,
        default: 0,
        min: 0,
    },
    dealerPerSaleIncentive: {
        type: Number,
        default: 0,
        min: 0,
    },
    subDealerPerSaleIncentive: {
        type: Number,
        default: 0,
        min: 0,
    },
}, {
    timestamps: true,
});

export default mongoose.model('IncentiveSetting', incentiveSettingSchema);
