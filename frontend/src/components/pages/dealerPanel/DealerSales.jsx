import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { getDealerSales, updateSale, createSale } from '../Dealers/services/dealerSalesService';
import { toast } from 'react-hot-toast';
import EditSaleModal from '../Dealers/components/EditSaleModal';
import { Edit } from 'lucide-react';
import SellQRScannerModal from '../../global/SellQRScannerModal';
import SaleModal from '../Dealers/components/SaleModal';
import axios from 'axios';

const DealerSales = () => {
    const { user } = useContext(AuthContext);
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSale, setSelectedSale] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [showScannerModal, setShowScannerModal] = useState(false);
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [scannedProduct, setScannedProduct] = useState(null);
    const [billingConfig, setBillingConfig] = useState(null);

    // Fetch dealer sales
    const fetchSales = async () => {
        if (!user || !user.dealer) {
            setLoading(false);
            return;
        }
        try {
            const [salesData, configResponse] = await Promise.all([
                getDealerSales(user.dealer._id),
                axios.get(`${import.meta.env.VITE_API_URL}/api/billing-config`),
            ]);
            setSales(salesData);
            setBillingConfig(configResponse.data);
        } catch (error) {
            toast.error('Error fetching sales');
            console.error('Error fetching sales:', error);
        } finally {
            setLoading(false);
        }
    };

    const isEditable = (sale) => {
        if (!billingConfig) return true;
        const saleDate = new Date(sale.soldAt || sale.createdAt);
        const now = new Date();
        let deadlineMs = (billingConfig.saleEditDeadlineValue || 24) * 60 * 60 * 1000;
        if (billingConfig.saleEditDeadlineUnit === 'days') {
            deadlineMs = (billingConfig.saleEditDeadlineValue || 1) * 24 * 60 * 60 * 1000;
        }
        return (now - saleDate) <= deadlineMs;
    };

    useEffect(() => {
        fetchSales();
    }, [user]);

    // Open edit modal
    const handleEdit = (sale) => {
        setSelectedSale(sale);
        setIsEditModalOpen(true);
    };

    // Save updated sale data
    const handleSave = async (updatedData) => {
        if (!selectedSale) return;

        try {
            await updateSale(selectedSale._id, updatedData);
            toast.success('Sale updated successfully');
            setIsEditModalOpen(false);
            setSelectedSale(null);
            fetchSales();
        } catch (error) {
            toast.error('Error updating sale');
            console.error('Error updating sale:', error);
        }
    };

    // Handle product scanned from QR
    const handleProductScanned = (product) => {
        const group = {
            _id: product._id,
            productName: product.productName,
            productsInBox: [product],
        };
        setScannedProduct(group);
        setShowScannerModal(false);
        setShowSaleModal(true);
    };

    // Handle product sale
    const handleSale = async (customerData) => {
        if (!scannedProduct) return;

        try {
            for (const product of scannedProduct.productsInBox) {
                await createSale({
                    productId: product._id,
                    dealerId: user.dealer._id,
                    ...customerData,
                });
            }
            toast.success('Product sold successfully');
            setShowSaleModal(false);
            setScannedProduct(null);
            fetchSales();
        } catch (error) {
            toast.error('Error selling product');
            console.error('Error selling product:', error);
        }
    };

    return (
        <div className="p-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
                <button
                    onClick={() => setShowScannerModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Scan Product to Sell
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4d55f5] mx-auto"></div>
                        <p className="mt-4 text-gray-500">Loading sales...</p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Product Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Serial Number
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Customer Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Customer Phone
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Plumber Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Sold At
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Incentive
                                </th>
                                <th className="relative px-6 py-3">
                                    <span className="sr-only">Edit</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sales.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan="7"
                                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center"
                                    >
                                        No sales found.
                                    </td>
                                </tr>
                            ) : (
                                sales.map((sale) => (
                                    <tr key={sale._id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {sale.product.productName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {sale.product.serialNumber}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {sale.customerName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {sale.customerPhone}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {sale.plumberName || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(sale.soldAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                            {sale.incentiveStatus?.replaceAll('_', ' ') || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {isEditable(sale) && (
                                                <button
                                                    onClick={() => handleEdit(sale)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                >
                                                    <Edit className="h-5 w-5" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modals */}
            {selectedSale && (
                <EditSaleModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    sale={selectedSale}
                    onSave={handleSave}
                />
            )}

            <SellQRScannerModal
                isOpen={showScannerModal}
                onClose={() => setShowScannerModal(false)}
                onProductScanned={handleProductScanned}
            />

            {scannedProduct && (
                <SaleModal
                    isOpen={showSaleModal}
                    onClose={() => setShowSaleModal(false)}
                    group={scannedProduct}
                    onSale={handleSale}
                />
            )}
        </div>
    );
};

export default DealerSales;
