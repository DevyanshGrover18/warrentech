import express from "express";
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import cors from 'cors';
import orderRoutes from './routes/ordersRoutes.js';
import factoryRoutes from './routes/factoryRoutes.js';
import distributorRoutes from './routes/distributorRoutes.js';
import distributorSalesRoutes from './routes/distributorSalesRoutes.js';
import productRoutes from './routes/productRoutes.js';
import dealerRoutes from './routes/dealerRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import distributorProductRoutes from './routes/distributorProductRoutes.js';
import dealerProductRoutes from './routes/dealerProductRoutes.js';
import distributorDealerProductRoutes from './routes/distributorDealerProductRoutes.js';
import factoryOrderRoutes from './routes/factoryOrderRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import modelRoutes from './routes/modelRoutes.js';
import pdfRoutes from './routes/pdfRoutes.js';
import qrRoutes from './routes/qrRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import saleRoutes from './routes/saleRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import distributorRequestRoutes from './routes/distributorRequestRoutes.js';
import dealerDeletionRequestRoutes from './routes/dealerDeletionRequestRoutes.js';
import technicianRoutes from './routes/technicianRoutes.js';
import replacementRequestRoutes from './routes/replacementRequestRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import billingConfigRoutes from './routes/billingConfigRoutes.js';
import executiveRoutes from './routes/executiveRoutes.js'
import incentiveRoutes from './routes/incentiveRoutes.js';
import walletRoutes from './routes/walletRoutes.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/public', express.static('public'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/factories', factoryRoutes);
app.use('/api/distributors', distributorRoutes);
app.use('/api/distributor-sales', distributorSalesRoutes);
app.use('/api/distributor/products', distributorProductRoutes);
app.use('/api/distributor-dealer-products', distributorDealerProductRoutes);
app.use('/api/dealers', dealerRoutes);
app.use('/api/dealer/products', dealerProductRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/factory-orders', factoryOrderRoutes);
app.use('/api/distributor-requests', distributorRequestRoutes);
app.use('/api/dealer-deletion-requests', dealerDeletionRequestRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/replacement-requests', replacementRequestRoutes);
app.use('/api/technicians', technicianRoutes);
app.use('/api/billing-config', billingConfigRoutes);
app.use('/api/executive', executiveRoutes)
app.use('/api/incentives', incentiveRoutes);
app.use('/api/wallets', walletRoutes);

app.get("/", (req, res) => {
  res.send("🚀 Backend is running!");
});

connectDB();

app.listen(PORT, () => {
  console.log(`✅ Server started on http://localhost:${PORT}`);
});
