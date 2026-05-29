import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const subDealerSchema = new mongoose.Schema({
    subDealerId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    contactPerson: {
        type: String,
        required: true,
        trim: true
    },
    contactPhone: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    status: {
        type: String,
        required: true,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    },
    dealer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Dealer',
        required: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    walletBalance: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});

// Add index for better search performance
subDealerSchema.index({ name: 'text', address: 'text', city: 'text', state: 'text' });

subDealerSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

const SubDealer = mongoose.model('SubDealer', subDealerSchema);

export default SubDealer;
