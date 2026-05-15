import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'factory', 'distributor', 'dealer', 'technician', 'executive'],
        required: true
    },
    factory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Factory',
        required: function() {
            return this.role === 'factory';
        }
    },
    distributor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Distributor',
        required: function() {
            return this.role === 'distributor';
        }
    },
    dealer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Dealer',
        required: function() {
            return this.role === 'dealer';
        }
    },
    executive: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Executive',
        required: function() {
            return this.role === 'executive';
        }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

export default mongoose.model('User', userSchema);