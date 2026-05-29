import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
    dealer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Dealer'
    },
    subDealer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubDealer'
    },
    distributor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Distributor'
    },
  customerName: {
    type: String,
  },
  customerPhone: {
    type: String,
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
  },
  customerEmail: {
    type: String,
  },
  customerAddress: {
    type: String,
  },
  customerState: {
    type: String,
  },
  customerCity: {
    type: String,
  },
  plumberName: {
    type: String,
  },
  plumberPhone: {
    type: String,
  },
  soldBy: {
    type: String,
    trim: true,
  },
  createdByRole: {
    type: String,
    enum: ['admin', 'member', 'distributor', 'dealer', 'sub_dealer'],
  },
  createdByUserId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  createdByEntityType: {
    type: String,
    enum: ['distributor', 'dealer', 'sub_dealer', null],
    default: null,
  },
  createdByEntityId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  formCompletedByRole: {
    type: String,
    enum: ['admin', 'member', 'distributor', 'dealer', 'sub_dealer', null],
    default: null,
  },
  formCompletedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  adminTouchedForm: {
    type: Boolean,
    default: false,
  },
  incentiveEligible: {
    type: Boolean,
    default: false,
  },
  incentiveType: {
    type: String,
    enum: ['distributor', 'dealer', 'sub_dealer', null],
    default: null,
  },
  incentiveAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  incentiveStatus: {
    type: String,
    enum: ['not_applicable', 'incomplete', 'pending_approval', 'approved', 'rejected'],
    default: 'not_applicable',
  },
  incentiveApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  incentiveApprovedAt: {
    type: Date,
    default: null,
  },
  incentiveRejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  incentiveRejectedAt: {
    type: Date,
    default: null,
  },
  incentiveRejectionNote: {
    type: String,
    trim: true,
    default: '',
  },
  soldAt: {
    type: Date,
    default: Date.now,
  },
  saleDate: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

export default mongoose.model('Sale', saleSchema);
