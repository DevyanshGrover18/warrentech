import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import DistributorQRScannerModal from '../../global/DistributorQRScannerModal';
import InventoryManagementModal from '../Products/components/InventoryManagementModal';
import { Search, Box, Building, X } from 'lucide-react';
import { FilterGroup, FilterItem, FilterSelector } from '../../global/FilterGroup';
import { distributorDealerProductService } from '../../../services/distributorDealerProductService';
import { distributorSalesService } from '../../../services/distributorSalesService';
import SaleModal from '../Dealers/components/SaleModal';

const API_URL = `${import.meta.env.VITE_API_URL}/api/distributors`;

export default function DistributorProducts() {
    const { user } = useContext(AuthContext);
    const [products, setProducts] = useState([]);
    const [dealers, setDealers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showScannerModal, setShowScannerModal] = useState(false);
    const [showSellModal, setShowSellModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedDealer, setSelectedDealer] = useState('');

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [factoryFilter, setFactoryFilter] = useState('');
    const [modelFilter, setModelFilter] = useState('');
    const [startSerialNumber, setStartSerialNumber] = useState('');
    const [endSerialNumber, setEndSerialNumber] = useState('');
    const [factories, setFactories] = useState([]);
    const [models, setModels] = useState([]);
    
    // Modal states
    const [isModelModalOpen, setIsModelModalOpen] = useState(false);
    const [activeModelId, setActiveModelId] = useState(null);
    const [selectedProductIds, setSelectedProductIds] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [modalCurrentPage, setModalCurrentPage] = useState(1);
    const [modalItemsPerPage, setModalItemsPerPage] = useState(10);
    const [modalFactoryFilter, setModalFactoryFilter] = useState('all');
    const [boxTypeFilter, setBoxTypeFilter] = useState('all');

    const fetchProducts = async () => {
        if (!user || !user.distributor) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const [productsResponse, dealersResponse] = await Promise.all([
                axios.get(`${API_URL}/${user.distributor._id}/products`),
                axios.get(`${API_URL}/${user.distributor._id}/dealers`)
            ]);
            setProducts(productsResponse.data);
            setDealers(dealersResponse.data);
            
            const uniqueFactories = [...new Map(productsResponse.data
                .filter(p => p.factory)
                .map(p => [p.factory._id, p.factory])
            ).values()];
            setFactories(uniqueFactories);
            
            const uniqueModels = [...new Map(productsResponse.data
                .filter(p => p.model)
                .map(p => [p.model._id, p.model])
            ).values()];
            setModels(uniqueModels);
        } catch (error) {
            toast.error('Error fetching data');
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [user]);

    const getSerialCounter = (serialNumber) => {
        if (!serialNumber) return 0;
        const match = serialNumber.match(/(\d+)$/);
        return match ? parseInt(match[1]) : 0;
    };

    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            const matchesSearch = (product.productName && product.productName.toLowerCase().includes(lowerCaseSearchTerm)) ||
                                 (product.serialNumber && product.serialNumber.toLowerCase().includes(lowerCaseSearchTerm)) ||
                                 (product.model && product.model.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
                                 (product.factory && product.factory.name.toLowerCase().includes(lowerCaseSearchTerm));
            
            const matchesFactory = !factoryFilter || product.factory?._id === factoryFilter;
            const matchesModel = !modelFilter || product.model?._id === modelFilter;
            const isAvailable = !product.sold && !product.assignedTo;
            
            return matchesSearch && matchesFactory && matchesModel && isAvailable;
        });
    }, [products, searchTerm, factoryFilter, modelFilter]);

    const modelGroups = useMemo(() => {
        const map = {};
        filteredProducts.forEach(p => {
            const mid = p.model?._id || 'unknown';
            if (!map[mid]) map[mid] = { model: p.model || { name: 'Unknown' }, count: 0, products: [] };
            map[mid].count += 1;
            map[mid].products.push(p);
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
        let filtered = filteredProducts.filter(p => p.model?._id === activeModelId);

        if (modalFactoryFilter !== 'all') {
            filtered = filtered.filter(p => p.factory?._id === modalFactoryFilter);
        }

        if (boxTypeFilter !== 'all') {
            filtered = filtered.filter(p => `${p.unitsPerBox}N` === boxTypeFilter);
        }

        return filtered.sort((a, b) => getSerialCounter(a.serialNumber) - getSerialCounter(b.serialNumber));
    }, [filteredProducts, activeModelId, modalFactoryFilter, boxTypeFilter]);

    const modalTotalPages = Math.ceil(modalProducts.length / modalItemsPerPage) || 1;
    const paginatedModalProducts = useMemo(() => {
        const indexOfLastItem = modalCurrentPage * modalItemsPerPage;
        const indexOfFirstItem = indexOfLastItem - modalItemsPerPage;
        return modalProducts.slice(indexOfFirstItem, indexOfLastItem);
    }, [modalProducts, modalCurrentPage, modalItemsPerPage]);

    const modalRows = useMemo(() => (
        paginatedModalProducts.map(product => ({
            id: product._id,
            checked: selectedProductIds.includes(product._id),
            model: product.model?.name || product.productName || 'N/A',
            boxType: `${product.unitsPerBox || ''}N`,
            serialNumber: product.serialNumber || 'N/A',
            mrp: `${product.price} /- Each`,
            factory: product.factory?.name || 'N/A',
            distributor: 'N/A',
        }))
    ), [paginatedModalProducts, selectedProductIds]);

    const openModelModal = (modelId) => {
        setActiveModelId(modelId);
        setIsModelModalOpen(true);
        setSelectedProductIds([]);
    };

    const closeModelModal = () => {
        setIsModelModalOpen(false);
        setActiveModelId(null);
    };

    const handleProductSelect = (productIds, isSelected) => {
        const ids = Array.isArray(productIds) ? productIds : [productIds];
        if (isSelected) {
            setSelectedProductIds(prev => [...new Set([...prev, ...ids])]);
        } else {
            setSelectedProductIds(prev => prev.filter(id => !ids.includes(id)));
        }
    };

    const handleSelectRange = () => {
        const startCounter = getSerialCounter(startSerialNumber);
        const endCounter = getSerialCounter(endSerialNumber);
        if (startCounter === 0 || endCounter === 0 || startCounter > endCounter) {
            toast.error('Invalid serial number format or range.');
            return;
        }

        const selectedProducts = modalProducts
            .filter(product => {
                const itemCounter = getSerialCounter(product.serialNumber);
                return itemCounter >= startCounter && itemCounter <= endCounter;
            });

        const productIds = selectedProducts.map(p => p._id);
        setSelectedProductIds(prev => [...new Set([...prev, ...productIds])]);
    };

    const handleUnselectRange = () => {
        const startCounter = getSerialCounter(startSerialNumber);
        const endCounter = getSerialCounter(endSerialNumber);
        if (startCounter === 0 || endCounter === 0 || startCounter > endCounter) {
            toast.error('Invalid serial number format or range.');
            return;
        }

        const unselectedProductIds = modalProducts
            .filter(product => {
                const itemCounter = getSerialCounter(product.serialNumber);
                return itemCounter >= startCounter && itemCounter <= endCounter;
            })
            .map(p => p._id);

        setSelectedProductIds(prev => prev.filter(id => !unselectedProductIds.includes(id)));
    };

    const handleClearSelection = () => {
        setSelectedProductIds([]);
        setModalFactoryFilter('all');
        setBoxTypeFilter('all');
        setStartSerialNumber('');
        setEndSerialNumber('');
        setModalCurrentPage(1);
    };

    const handleAssign = async () => {
        if (!selectedDealer) {
            toast.error('Please select a dealer');
            return;
        }

        try {
            for (const productId of selectedProductIds) {
                await distributorDealerProductService.assignProductToDealer({
                    distributorId: user.distributor._id,
                    dealerId: selectedDealer,
                    productId: productId
                });
            }
            toast.success('Products assigned successfully');
            setShowAssignModal(false);
            setSelectedProductIds([]);
            setSelectedDealer('');
            closeModelModal();
            fetchProducts();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error assigning products');
            console.error('Error:', error);
        }
    };

    const handleSellToCustomer = async (saleData) => {
        const { customerName, customerPhone, customerEmail, customerAddress, customerState, customerCity, plumberName, plumberPhone } = saleData;

        try {
            await distributorSalesService.sellToCustomer({
                productIds: selectedProductIds,
                distributorId: user.distributor._id,
                customerName,
                customerPhone,
                customerEmail,
                customerAddress,
                customerState,
                customerCity,
                plumberName,
                plumberPhone
            });
            toast.success(`${selectedProductIds.length} products sold successfully!`);
            setShowSellModal(false);
            setSelectedProductIds([]);
            closeModelModal();
            fetchProducts();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error selling products.');
            console.error('Error selling products:', error);
        }
    };

    return (
        <div className="p-4 lg:p-4 min-h-full">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 lg:p-6 border-b border-gray-200">
                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between space-y-4 xl:space-y-0">
                        <div className="flex-shrink-0">
                            <h2 className="text-lg font-semibold text-gray-900">Inventory</h2>
                            <p className="text-sm text-gray-600">Total Products: {filteredProducts.length}</p>
                        </div>
                        <button
                            onClick={() => setShowScannerModal(true)}
                            className="flex items-center justify-center bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                            <span>Scan Product</span>
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
                        <p className="mt-4 text-gray-500">Loading products...</p>
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

            <InventoryManagementModal
                isOpen={isModelModalOpen}
                onClose={closeModelModal}
                modelName={models.find(m => m._id === activeModelId)?.name || 'Details'}
                factoryFilter={modalFactoryFilter}
                onFactoryFilterChange={(value) => {
                    setModalFactoryFilter(value);
                    setModalCurrentPage(1);
                }}
                factories={factories}
                boxTypeFilter={boxTypeFilter}
                onBoxTypeFilterChange={(value) => {
                    setBoxTypeFilter(value);
                    setModalCurrentPage(1);
                }}
                boxTypeOptions={['All', '1N', '2N', '3N']}
                startSerial={startSerialNumber}
                onStartSerialChange={setStartSerialNumber}
                endSerial={endSerialNumber}
                onEndSerialChange={setEndSerialNumber}
                onSelectRange={handleSelectRange}
                onUnselectRange={handleUnselectRange}
                onClearAll={handleClearSelection}
                rowsPerPage={modalItemsPerPage}
                onRowsPerPageChange={(value) => {
                    setModalItemsPerPage(value);
                    setModalCurrentPage(1);
                }}
                currentPage={modalCurrentPage}
                totalPages={modalTotalPages}
                onPreviousPage={() => setModalCurrentPage(prev => Math.max(1, prev - 1))}
                onNextPage={() => setModalCurrentPage(prev => Math.min(modalTotalPages, prev + 1))}
                transferCount={selectedProductIds.length}
                transferDisabled={selectedProductIds.length === 0}
                transferLabel="Assign/Sell"
                onTransfer={() => setShowAssignModal(true)}
                rows={modalRows}
                allRowsSelected={selectedProductIds.length > 0 && paginatedModalProducts.every(p => selectedProductIds.includes(p._id))}
                onToggleAllRows={(isSelected) => {
                    const ids = paginatedModalProducts.map(p => p._id);
                    handleProductSelect(ids, isSelected);
                }}
                onRowToggle={(rowId, isChecked) => handleProductSelect(rowId, isChecked)}
                showEdit={false}
                showingFrom={modalProducts.length > 0 ? (modalCurrentPage - 1) * modalItemsPerPage + 1 : 0}
                showingTo={Math.min(modalCurrentPage * modalItemsPerPage, modalProducts.length)}
                totalItems={modalProducts.length}
            />

            {showAssignModal && (
                <div className="fixed inset-0 bg-black/70 bg-opacity-20 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Action for {selectedProductIds.length} Products
                            </h3>
                            <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Dealer</label>
                                <div className="flex gap-2">
                                    <select
                                        value={selectedDealer}
                                        onChange={(e) => setSelectedDealer(e.target.value)}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
                                    >
                                        <option value="">Select a dealer</option>
                                        {dealers.map(dealer => (
                                            <option key={dealer._id} value={dealer._id}>{dealer.name}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={handleAssign}
                                        disabled={!selectedDealer}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                                    >
                                        Assign
                                    </button>
                                </div>
                            </div>

                            <div className="border-t border-gray-200 pt-4">
                                <button
                                    onClick={() => { setShowAssignModal(false); setShowSellModal(true); }}
                                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                                >
                                    Sell directly to Customer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <DistributorQRScannerModal 
                isOpen={showScannerModal} 
                onClose={() => setShowScannerModal(false)}
                onProductAssigned={fetchProducts}
            />

            <SaleModal
                isOpen={showSellModal}
                onClose={() => setShowSellModal(false)}
                productSelection={modalProducts.filter(p => selectedProductIds.includes(p._id)).map(p => ({
                    _id: p._id,
                    productName: p.productName,
                    productsInBox: [p]
                }))}
                onSale={handleSellToCustomer}
            />
        </div>
    );
}

