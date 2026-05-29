import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Search, Box, Building, X } from 'lucide-react';
import { FilterGroup, FilterItem, FilterSelector } from '../../global/FilterGroup';

export default function ExecutiveInventory() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [factoryFilter, setFactoryFilter] = useState('');
    const [modelFilter, setModelFilter] = useState('');
    const [factories, setFactories] = useState([]);
    const [models, setModels] = useState([]);

    // Modal states
    const [isModelModalOpen, setIsModelModalOpen] = useState(false);
    const [activeModelId, setActiveModelId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [modalCurrentPage, setModalCurrentPage] = useState(1);
    const [modalItemsPerPage, setModalItemsPerPage] = useState(10);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/sales/assigned-products`);
            setProducts(data);

            const uniqueFactories = [...new Map(data
                .filter(product => product.factory)
                .map(product => [product.factory._id, product.factory])
            ).values()];
            setFactories(uniqueFactories);

            const uniqueModels = [...new Map(data
                .filter(product => product.model)
                .map(product => [product.model._id, product.model])
            ).values()];
            setModels(uniqueModels);
        } catch (error) {
            toast.error('Error fetching inventory');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            const matchesSearch = (product.productName && product.productName.toLowerCase().includes(lowerCaseSearchTerm)) ||
                                 (product.serialNumber && product.serialNumber.toLowerCase().includes(lowerCaseSearchTerm)) ||
                                 (product.model && product.model.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
                                 (product.factory && product.factory.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
                                 (product.distributor && product.distributor.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
                                 (product.dealer && product.dealer.name.toLowerCase().includes(lowerCaseSearchTerm));

            const matchesFactory = !factoryFilter || product.factory?._id === factoryFilter;
            const matchesModel = !modelFilter || product.model?._id === modelFilter;

            return matchesSearch && matchesFactory && matchesModel;
        });
    }, [products, searchTerm, factoryFilter, modelFilter]);

    const modelGroups = useMemo(() => {
        const map = {};
        filteredProducts.forEach(p => {
            const mid = p.model?._id || 'unknown';
            if (!map[mid]) map[mid] = { model: p.model || { name: 'Unknown' }, count: 0, items: [] };
            map[mid].count += 1;
            map[mid].items.push(p);
        });
        return Object.values(map);
    }, [filteredProducts]);

    const paginatedModelGroups = useMemo(() => {
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return modelGroups.slice(indexOfFirstItem, indexOfLastItem);
    }, [modelGroups, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(modelGroups.length / itemsPerPage) || 1;

    const modalProducts = useMemo(() => {
        return filteredProducts.filter(p => p.model?._id === activeModelId);
    }, [filteredProducts, activeModelId]);

    const modalTotalPages = Math.ceil(modalProducts.length / modalItemsPerPage) || 1;
    const paginatedModalProducts = useMemo(() => {
        const indexOfLastItem = modalCurrentPage * modalItemsPerPage;
        const indexOfFirstItem = indexOfLastItem - modalItemsPerPage;
        return modalProducts.slice(indexOfFirstItem, indexOfLastItem);
    }, [modalProducts, modalCurrentPage, modalItemsPerPage]);

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
                            <h2 className="text-lg font-semibold text-gray-900">Inventory</h2>
                            <p className="text-sm text-gray-600">Assigned Items: {filteredProducts.length}</p>
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
                                <FilterSelector
                                    value={factoryFilter}
                                    onChange={setFactoryFilter}
                                    options={factories}
                                    placeholder="All Factories"
                                    icon={Building}
                                />
                            </FilterItem>
                            <FilterItem>
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setModelFilter('');
                                        setFactoryFilter('');
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
                        <p className="mt-4 text-gray-500">Loading inventory...</p>
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
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. of Products</th>
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
                                                    {mg.count || 0} Total Products
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
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order / Box</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial Number</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factory</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distributor</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dealer</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sold Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {paginatedModalProducts.map((p) => (
                                            <tr key={p._id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.orderId} / {p.boxNumber}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.serialNumber}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.factory?.name || '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.distributor?.name || '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.dealer?.name || '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${p.sold ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                        {p.sold ? 'Sold' : 'In Stock'}
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
                                <span>Showing {modalProducts.length > 0 ? (modalCurrentPage - 1) * modalItemsPerPage + 1 : 0} to {Math.min(modalCurrentPage * modalItemsPerPage, modalProducts.length)} of {modalProducts.length} items</span>
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
