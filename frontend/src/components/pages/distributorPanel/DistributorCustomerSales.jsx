import { ShoppingCart, QrCode, User, Phone, Calendar, Edit, Search, Box, X, Eye } from 'lucide-react';
import { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../../../context/AuthContext';
import { distributorSalesService } from '../../../services/distributorSalesService';
import { toast } from 'react-hot-toast';
import SellQRScannerModal from '../../global/SellQRScannerModal';
import SaleModal from '../Dealers/components/SaleModal';
import { createSale } from '../Dealers/services/dealerSalesService';
import EditSaleModal from '../Dealers/components/EditSaleModal';
import { updateSale } from '../Dealers/services/dealerSalesService';
import { FilterGroup, FilterItem, FilterSelector } from '../../global/FilterGroup';

export default function DistributorCustomerSales() {
    const { user } = useContext(AuthContext);
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showScannerModal, setShowScannerModal] = useState(false);
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [scannedProduct, setScannedProduct] = useState(null);
    const [selectedSale, setSelectedSale] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [modalInitialMode, setModalMode] = useState('edit');
    const [billingConfig, setBillingConfig] = useState(null);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [modelFilter, setModelFilter] = useState('');
    const [models, setModels] = useState([]);

    // Modal states
    const [isModelModalOpen, setIsModelModalOpen] = useState(false);
    const [activeModelId, setActiveModelId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [modalCurrentPage, setModalCurrentPage] = useState(1);
    const [modalItemsPerPage, setModalItemsPerPage] = useState(10);

    const fetchSales = async () => {
        if (!user || !user.distributor) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const [salesResponse, configResponse] = await Promise.all([
                distributorSalesService.getCustomerSales(user.distributor._id),
                axios.get(`${import.meta.env.VITE_API_URL}/api/billing-config`),
            ]);
            setSales(salesResponse.data);
            setBillingConfig(configResponse.data);

            const uniqueModels = [...new Map(salesResponse.data
                .filter(s => s.product && s.product.model)
                .map(s => [s.product.model._id, s.product.model])
            ).values()];
            setModels(uniqueModels);
        } catch (error) {
            toast.error('Error fetching data');
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const isEditable = (sale) => {
        if (!billingConfig) return false; // Default to false until config loads
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

    const filteredSales = useMemo(() => {
        return sales.filter(sale => {
            const product = sale.product;
            if (!product) return false;

            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            const matchesSearch = (product.productName && product.productName.toLowerCase().includes(lowerCaseSearchTerm)) ||
                                 (product.serialNumber && product.serialNumber.toLowerCase().includes(lowerCaseSearchTerm)) ||
                                 (sale.customerName && sale.customerName.toLowerCase().includes(lowerCaseSearchTerm)) ||
                                 (sale.customerPhone && sale.customerPhone.toLowerCase().includes(lowerCaseSearchTerm));
            
            const matchesModel = !modelFilter || product.model?._id === modelFilter;
            
            return matchesSearch && matchesModel;
        });
    }, [sales, searchTerm, modelFilter]);

    const modelGroups = useMemo(() => {
        const map = {};
        filteredSales.forEach(sale => {
            const mid = sale.product.model?._id || 'unknown';
            if (!map[mid]) map[mid] = { model: sale.product.model || { name: 'Unknown' }, count: 0, sales: [] };
            map[mid].count += 1;
            map[mid].sales.push(sale);
        });
        return Object.values(map);
    }, [filteredSales]);

    const paginatedModelGroups = useMemo(() => {
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return modelGroups.slice(indexOfFirstItem, indexOfLastItem);
    }, [modelGroups, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(modelGroups.length / itemsPerPage) || 1;

    const modalSales = useMemo(() => {
        return filteredSales.filter(sale => sale.product.model?._id === activeModelId);
    }, [filteredSales, activeModelId]);

    const modalTotalPages = Math.ceil(modalSales.length / modalItemsPerPage) || 1;
    const paginatedModalSales = useMemo(() => {
        const indexOfLastItem = modalCurrentPage * modalItemsPerPage;
        const indexOfFirstItem = indexOfLastItem - modalItemsPerPage;
        return modalSales.slice(indexOfFirstItem, indexOfLastItem);
    }, [modalSales, modalCurrentPage, modalItemsPerPage]);

    const openModelModal = (modelId) => {
        setActiveModelId(modelId);
        setIsModelModalOpen(true);
        setModalCurrentPage(1);
    };

    const handleEdit = (sale) => {
        setSelectedSale(sale);
        setModalMode('edit');
        setIsEditModalOpen(true);
    };

    const handleView = (sale) => {
        setSelectedSale(sale);
        setModalMode('view');
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

    return (
        <div className="p-4 lg:p-4 min-h-full">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 lg:p-6 border-b border-gray-200">
                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between space-y-4 xl:space-y-0">
                        <div className="flex-shrink-0">
                            <h2 className="text-lg font-semibold text-gray-900">Customer Sales</h2>
                            <p className="text-sm text-gray-600">Total Sales: {filteredSales.length}</p>
                        </div>
                        <button
                            onClick={() => setShowScannerModal(true)}
                            className="inline-flex items-center px-6 py-3 rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-transform hover:scale-105"
                        >
                            <QrCode className="mr-3 h-6 w-6" />
                            Scan Product to Sell
                        </button>
                    </div>

                    <div className="mt-4">
                        <FilterGroup>
                            <FilterItem>
                                <div className="relative flex-grow">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 bg-gray-50 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
                                    />
                                </div>
                            </FilterItem>
                            <FilterItem>
                                <FilterSelector
                                    value={modelFilter}
                                    onChange={setModelFilter}
                                    options={models}
                                    placeholder="All Models"
                                    icon={Box}
                                />
                            </FilterItem>
                            <FilterItem>
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setModelFilter('');
                                    }}
                                    className="flex items-center justify-center bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                                >
                                    <span>Clear Filters</span>
                                </button>
                            </FilterItem>
                        </FilterGroup>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-500">Loading sales...</p>
                    </div>
                ) : modelGroups.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        No sales found.
                    </div>
                ) : (
                    <div className="p-4">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sales</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {paginatedModelGroups.map((mg) => (
                                        <tr key={mg.model?._id || mg.model.name} className="hover:bg-gray-50">
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{mg.model?.name || 'Unknown'}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <button
                                                    onClick={() => openModelModal(mg.model?._id)}
                                                    className="inline-flex items-center px-2.5 py-1.5 border border-[#4d55f5] text-xs font-medium rounded text-[#4d55f5] hover:bg-[#4d55f5] hover:text-white transition-colors"
                                                >
                                                    <Box className="h-4 w-4 mr-1" />
                                                    {mg.count || 0} Total Sales
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                            <div className="text-sm text-gray-700">Rows per page:
                                <select
                                    className="ml-2 border border-gray-300 rounded px-2 py-1"
                                    value={itemsPerPage}
                                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                >
                                    <option value="5">5</option>
                                    <option value="10">10</option>
                                    <option value="25">25</option>
                                </select>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-700">
                                    Showing {modelGroups.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, modelGroups.length)} of {modelGroups.length} models
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Model Detail Modal */}
            {isModelModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setIsModelModalOpen(false)}></div>
                    <div className="relative z-10 flex h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-[96vw] flex-col rounded-2xl border border-gray-200 bg-white shadow-xl">
                        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
                            <h3 className="text-lg font-bold text-gray-900">
                                Model: {models.find(m => m._id === activeModelId)?.name || 'Details'}
                            </h3>
                            <button onClick={() => setIsModelModalOpen(false)} className="rounded-full p-2 text-gray-500 hover:bg-gray-100">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-6">
                            <div className="overflow-x-auto rounded-xl border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Product Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Serial Number</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer Phone</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Plumber Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Sold At</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Incentive</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {paginatedModalSales.map((sale) => (
                                            <tr key={sale._id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{sale.product.productName}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">{sale.product.serialNumber}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm flex items-center"><User className="h-4 w-4 mr-2 text-gray-400" />{sale.customerName}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm flex items-center"><Phone className="h-4 w-4 mr-2 text-gray-400" />{sale.customerPhone}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">{sale.plumberName || '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm flex items-center"><Calendar className="h-4 w-4 mr-2 text-gray-400" />{new Date(sale.soldAt).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">{sale.incentiveStatus?.replaceAll('_', ' ') || '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => handleView(sale)} className="text-blue-600 hover:text-blue-900">
                                                            <Eye className="h-5 w-5" />
                                                        </button>
                                                        {isEditable(sale) && (
                                                            <button onClick={() => handleEdit(sale)} className="text-blue-600 hover:text-blue-900">
                                                                <Edit className="h-5 w-5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="border-t border-gray-200 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div className="text-sm text-gray-700">
                                Rows per page:
                                <select
                                    className="ml-2 border border-gray-300 rounded px-2 py-1"
                                    value={modalItemsPerPage}
                                    onChange={(e) => { setModalItemsPerPage(Number(e.target.value)); setModalCurrentPage(1); }}
                                >
                                    <option value="10">10</option>
                                    <option value="25">25</option>
                                    <option value="50">50</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                <span>Showing {modalSales.length > 0 ? (modalCurrentPage - 1) * modalItemsPerPage + 1 : 0} to {Math.min(modalCurrentPage * modalItemsPerPage, modalSales.length)} of {modalSales.length} sales</span>
                                <button onClick={() => setModalCurrentPage(prev => Math.max(1, prev - 1))} disabled={modalCurrentPage === 1} className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50">Previous</button>
                                <span>Page {modalCurrentPage} of {modalTotalPages}</span>
                                <button onClick={() => setModalCurrentPage(prev => Math.min(modalTotalPages, prev + 1))} disabled={modalCurrentPage === modalTotalPages} className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50">Next</button>
                            </div>
                        </div>
                    </div>
                </div>
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
                    productSelection={scannedProduct}
                    onSale={handleSale}
                />
            )}

            {selectedSale && (
                <EditSaleModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    sale={selectedSale}
                    onSave={handleSave}
                    initialMode={modalInitialMode}
                    canEdit={isEditable(selectedSale)}
                />
            )}
        </div>
    );
}

