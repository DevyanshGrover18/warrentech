import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, required: false, unique: false },
  address: { type: String },
  state: { type: String },
  city: { type: String },
  plumberName: { type: String },
  plumberPhone: { type: String },
  password: { type: String, required: false },
}, { timestamps: true });

export default mongoose.model('Customer', customerSchema);
