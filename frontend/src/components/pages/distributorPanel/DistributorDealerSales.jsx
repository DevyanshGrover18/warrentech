import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { X, Box, Search, Eye } from 'lucide-react';
import { FilterGroup, FilterItem, FilterSelector } from '../../global/FilterGroup';
import { distributorDealerProductService } from '../../../services/distributorDealerProductService';

function DistributorDealerSales() {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
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

    useEffect(() => {
        const fetchDealerSales = async () => {
            try {
                setLoading(true);
                // Use service instead of direct axios call
                const response = await distributorDealerProductService.getDistributorAssignedProducts();
                setSales(response.data);

                const uniqueModels = [...new Map(response.data
                    .filter(s => s.product && s.product.model)
                    .map(s => [s.product.model._id, s.product.model])
                ).values()];
                setModels(uniqueModels);
            } catch (error) {
                toast.error(error.response?.data?.message || 'Error fetching dealer sales');
            } finally {
                setLoading(false);
            }
        };

        fetchDealerSales();
    }, []);

    const filteredSales = useMemo(() => {
        return sales.filter(item => {
            const product = item.product;
            if (!product) return false;

            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            const matchesSearch = (product.productName && product.productName.toLowerCase().includes(lowerCaseSearchTerm)) ||
                                 (product.serialNumber && product.serialNumber.toLowerCase().includes(lowerCaseSearchTerm)) ||
                                 (item.dealer?.name && item.dealer.name.toLowerCase().includes(lowerCaseSearchTerm));
            
            const matchesModel = !modelFilter || product.model?._id === modelFilter;
            
            return matchesSearch && matchesModel;
        });
    }, [sales, searchTerm, modelFilter]);

    const modelGroups = useMemo(() => {
        const map = {};
        filteredSales.forEach(item => {
            const mid = item.product.model?._id || 'unknown';
            if (!map[mid]) map[mid] = { model: item.product.model || { name: 'Unknown' }, count: 0, items: [] };
            map[mid].count += 1;
            map[mid].items.push(item);
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
        return filteredSales.filter(item => item.product.model?._id === activeModelId);
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

    return (
        <div className="p-4 lg:p-4 min-h-full">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 lg:p-6 border-b border-gray-200">
                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between space-y-4 xl:space-y-0">
                        <div className="flex-shrink-0">
                            <h2 className="text-lg font-semibold text-gray-900">Dealer Sales</h2>
                            <p className="text-sm text-gray-600">Total Products Assigned: {filteredSales.length}</p>
                        </div>
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
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4d55f5] mx-auto"></div>
                        <p className="mt-4 text-gray-500">Loading sales...</p>
                    </div>
                ) : modelGroups.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        No products found.
                    </div>
                ) : (
                    <div className="p-4">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Assigned</th>
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
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial Number</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dealer Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {paginatedModalSales.map((item) => (
                                            <tr key={item._id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.product.productName}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.product.serialNumber}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.dealer?.name || '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(item.assignedAt || item.createdAt).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${item.product.sold ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                        {item.product.sold ? 'Sold' : 'In Stock'}
                                                    </span>
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
        </div>
    );
}

export default DistributorDealerSales;