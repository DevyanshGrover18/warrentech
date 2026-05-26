import { ShoppingCart, QrCode, User, Phone, Calendar, Edit } from 'lucide-react';
import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../../context/AuthContext';
import { distributorSalesService } from '../../../services/distributorSalesService';
import { toast } from 'react-hot-toast';
import SellQRScannerModal from '../../global/SellQRScannerModal';
import SaleModal from '../Dealers/components/SaleModal';
import { createSale } from '../Dealers/services/dealerSalesService';
import EditSaleModal from '../Dealers/components/EditSaleModal';
import { updateSale } from '../Dealers/services/dealerSalesService';

export default function DistributorCustomerSales() {
    const { user } = useContext(AuthContext);
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showScannerModal, setShowScannerModal] = useState(false);
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [scannedProduct, setScannedProduct] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedSale, setSelectedSale] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [billingConfig, setBillingConfig] = useState(null);

    const fetchSales = async () => {
        if (!user || !user.distributor) {
            setLoading(false);
            return;
        }
        try {
            const [salesResponse, configResponse] = await Promise.all([
                distributorSalesService.getCustomerSales(user.distributor._id),
                axios.get(`${import.meta.env.VITE_API_URL}/api/billing-config`),
            ]);
            setSales(salesResponse.data);
            setBillingConfig(configResponse.data);
        } catch (error) {
            toast.error('Error fetching data');
            console.error('Error fetching data:', error);
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

    useEffect(() => {
        setCurrentPage(1);
    }, [sales]);

    // QR Scanned → Open Sale Modal
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

    // Create sale
    const handleSale = async (customerData) => {
        if (!scannedProduct) return;
        try {
            for (const product of scannedProduct.productsInBox) {
                await createSale({
                    productId: product._id,
                    distributorId: user.distributor._id,
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

    const handleEdit = (sale) => {
        setSelectedSale(sale);
        setIsEditModalOpen(true);
    };

    const handleSave = async (updatedData) => {
        if (!selectedSale) return;

        try {
            await updateSale(selectedSale._id, updatedData);
            toast.success('Sale updated successfully');
            setIsEditModalOpen(false);
            setSelectedSale(null);
            fetchSales();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error updating sale');
        }
    };

    // Pagination logic
    const totalPages = Math.ceil(sales.length / itemsPerPage) || 1;
    const indexOfLast = currentPage * itemsPerPage;
    const indexOfFirst = indexOfLast - itemsPerPage;
    const currentItems = sales.slice(indexOfFirst, indexOfLast);

    return (
        <div className="p-6 min-h-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Customer Sales</h1>
                    <p className="text-sm text-gray-500">Sell products directly to customers.</p>
                </div>
                <button
                    onClick={() => setShowScannerModal(true)}
                    className="inline-flex items-center px-6 py-3 rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-transform hover:scale-105"
                >
                    <QrCode className="mr-3 h-6 w-6" />
                    Scan Product to Sell
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-6 text-gray-500">Loading sales...</p>
                    </div>
                ) : sales.length === 0 ? (
                    <div className="text-center py-20">
                        <ShoppingCart className="mx-auto h-16 w-16 text-gray-400" />
                        <h3 className="mt-4 text-lg font-medium text-gray-900">No sales found</h3>
                        <p className="mt-1 text-sm text-gray-500">Get started by selling a product.</p>
                    </div>
                ) : (
                    <>
                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {['Product Name', 'Serial Number', 'Customer Name', 'Customer Email', 'Customer Phone', 'Plumber Name', 'Sold At', 'Incentive', 'Actions'].map((head) => (
                                            <th key={head} className="px-8 py-4 text-left text-xs font-semibold text-gray-500 uppercase">
                                                {head}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                <tbody className="bg-white divide-y divide-gray-200">
                                    {currentItems.map((sale) => (
                                        <tr key={sale._id} className="hover:bg-gray-50">
                                                <td className="px-8 py-5 whitespace-nowrap text-sm font-medium">{sale.product.productName}</td>
                                                <td className="px-8 py-5 whitespace-nowrap text-sm">{sale.product.serialNumber}</td>
                                                <td className="px-8 py-5 whitespace-nowrap text-sm flex items-center"><User className="h-4 w-4 mr-2 text-gray-400" />{sale.customerName}</td>
                                                <td className="px-8 py-5 whitespace-nowrap text-sm">{sale.customerEmail || '-'}</td>
                                                <td className="px-8 py-5 whitespace-nowrap text-sm flex items-center"><Phone className="h-4 w-4 mr-2 text-gray-400" />{sale.customerPhone}</td>
                                                <td className="px-8 py-5 whitespace-nowrap text-sm">{sale.plumberName || '-'}</td>
                                                <td className="px-8 py-5 whitespace-nowrap text-sm flex items-center"><Calendar className="h-4 w-4 mr-2 text-gray-400" />{new Date(sale.soldAt).toLocaleDateString()}</td>
                                                <td className="px-8 py-5 whitespace-nowrap text-sm capitalize">{sale.incentiveStatus?.replaceAll('_', ' ') || '-'}</td>
                                                <td className="px-8 py-5 whitespace-nowrap text-sm">
                                                    {isEditable(sale) && (
                                                        <button onClick={() => handleEdit(sale)} className="text-blue-600 hover:text-blue-900">
                                                            <Edit className="h-5 w-5" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-2 text-sm">
                                <span>Rows per page:</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="border rounded px-2 py-1"
                                >
                                    {[10, 25, 50, 75, 100].map(n => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-1 border rounded disabled:opacity-50"
                                >
                                    Previous
                                </button>

                                <span className="text-sm">
                                    Page {currentPage} of {totalPages}
                                </span>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage >= totalPages}
                                    className="px-4 py-1 border rounded disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Scanner Modal */}
            <SellQRScannerModal
                isOpen={showScannerModal}
                onClose={() => setShowScannerModal(false)}
                onProductScanned={handleProductScanned}
            />

            {/* Sale Modal */}
            {scannedProduct && (
                <SaleModal
                    isOpen={showSaleModal}
                    onClose={() => setShowSaleModal(false)}
                    group={scannedProduct}
                    onSale={handleSale}
                />
            )}

            {selectedSale && (
                <EditSaleModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    sale={selectedSale}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}
