import { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { Search, Download, Eye, QrCode, Box, X } from 'lucide-react';
import ErrorBoundary from '../../global/ErrorBoundary';
import QRScannerModal from '../../global/QRScannerModal';
import ViewSaleModal from './components/ViewSaleModal';
import { generateSerialNumberRanges } from './utils';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FilterGroup, FilterItem, FilterSelector } from '../../global/FilterGroup';

const API_URL = `${import.meta.env.VITE_API_URL}/api/factories`;

function FactorySales() {
    const { user } = useContext(AuthContext);
    const [dispatchedOrders, setDispatchedOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showScanner, setShowScanner] = useState(false);
    const [selectedSale, setSelectedSale] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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

    const fetchDispatchedOrders = async () => {
        if (!user || !user.factory) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const { data } = await axios.get(`${API_URL}/${user.factory._id}/sales`);
            setDispatchedOrders(data);

            const uniqueModels = [...new Map(data
                .filter(s => s.model)
                .map(s => [s.model._id, s.model])
            ).values()];
            setModels(uniqueModels);
        } catch (error) {
            toast.error('Error fetching sales data');
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDispatchedOrders();
    }, [user]);

    const filteredSales = useMemo(() => {
        return dispatchedOrders.filter(order => {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            const matchesSearch = (order.serialNumber && order.serialNumber.toLowerCase().includes(lowerCaseSearchTerm)) ||
                                 (order.orderId && order.orderId.toLowerCase().includes(lowerCaseSearchTerm)) ||
                                 (order.model && order.model.name.toLowerCase().includes(lowerCaseSearchTerm));
            
            const matchesModel = !modelFilter || order.model?._id === modelFilter;
            
            return matchesSearch && matchesModel;
        });
    }, [dispatchedOrders, searchTerm, modelFilter]);

    const modelGroups = useMemo(() => {
        const map = {};
        filteredSales.forEach(order => {
            const mid = order.model?._id || 'unknown';
            if (!map[mid]) map[mid] = { model: order.model || { name: 'Unknown' }, count: 0, items: [] };
            map[mid].count += 1;
            map[mid].items.push(order);
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
        return filteredSales.filter(order => order.model?._id === activeModelId);
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

    const handleViewDetails = (saleData) => {
        setSelectedSale(saleData);
        setIsDetailModalOpen(true);
    };

    return (
        <div className="p-4 lg:p-4 min-h-full">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 lg:p-6 border-b border-gray-200">
                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between space-y-4 xl:space-y-0">
                        <div className="flex-shrink-0">
                            <h2 className="text-lg font-semibold text-gray-900">Sales</h2>
                            <p className="text-sm text-gray-600">Total Dispatched Items: {filteredSales.length}</p>
                        </div>
                        <button
                            onClick={() => setShowScanner(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                            <QrCode className="h-4 w-4" />
                            Scan Product
                        </button>
                    </div>

                    <div className="mt-4">
                        <FilterGroup>
                            <FilterItem>
                                <div className="relative flex-grow">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by order ID or serial number..."
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
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Dispatched</th>
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
                                                    {mg.count || 0} Products
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
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial Number</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dispatched Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {paginatedModalSales.map((order) => (
                                            <tr key={order._id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{order.orderId}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.serialNumber}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.dispatchedAt ? new Date(order.dispatchedAt).toLocaleDateString() : '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${order.sold ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                        {order.sold ? 'Sold' : 'Dispatched'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <button
                                                        onClick={() => handleViewDetails(order)}
                                                        className="text-blue-600 hover:text-blue-900 font-medium"
                                                    >
                                                        View Details
                                                    </button>
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
                                <span>Showing {modalSales.length > 0 ? (modalCurrentPage - 1) * modalItemsPerPage + 1 : 0} to {Math.min(modalCurrentPage * modalItemsPerPage, modalSales.length)} of {modalSales.length} items</span>
                                <button onClick={() => setModalCurrentPage(prev => Math.max(1, prev - 1))} disabled={modalCurrentPage === 1} className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50">Previous</button>
                                <span>Page {modalCurrentPage} of {modalTotalPages}</span>
                                <button onClick={() => setModalCurrentPage(prev => Math.min(modalTotalPages, prev + 1))} disabled={modalCurrentPage === modalTotalPages} className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50">Next</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <QRScannerModal 
                isOpen={showScanner} 
                onClose={() => setShowScanner(false)}
                onProductUpdated={fetchDispatchedOrders}
                currentFactoryId={user?.factory?._id}
            />

            <ViewSaleModal 
                isOpen={isDetailModalOpen} 
                onClose={() => setIsDetailModalOpen(false)} 
                saleData={selectedSale} 
            />
        </div>
    );
}

export default function FactorySalesWithErrorBoundary() {
    return (
        <ErrorBoundary>
            <FactorySales />
        </ErrorBoundary>
    );
}