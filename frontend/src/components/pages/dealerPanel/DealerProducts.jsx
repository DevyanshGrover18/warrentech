import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import DealerQRScannerModal from '../../global/DealerQRScannerModal';
import SaleModal from '../Dealers/components/SaleModal';
import { createSale } from '../Dealers/services/dealerSalesService';
import InventoryManagementModal from '../Products/components/InventoryManagementModal';
import { Search, Box, Building, X } from 'lucide-react';
import { FilterGroup, FilterItem, FilterSelector } from '../../global/FilterGroup';

const API_URL = `${import.meta.env.VITE_API_URL}/api/distributor-dealer-products/dealer`;
const SUB_DEALER_API_URL = `${import.meta.env.VITE_API_URL}/api/dealer-sub-dealer-products`;

export default function DealerProducts() {
    const { user } = useContext(AuthContext);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showScannerModal, setShowScannerModal] = useState(false);
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedSubDealer, setSelectedSubDealer] = useState('');
    const [subDealers, setSubDealers] = useState([]);

    const isSubDealer = user?.role === 'sub_dealer';
    const entityId = isSubDealer ? (user?.subDealer?._id || user?.subDealer) : (user?.dealer?._id || user?.dealer);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [modelFilter, setModelFilter] = useState('');
    const [factoryFilter, setFactoryFilter] = useState('');
    const [startSerialNumber, setStartSerialNumber] = useState('');
    const [endSerialNumber, setEndSerialNumber] = useState('');
    const [models, setModels] = useState([]);
    const [factories, setFactories] = useState([]);

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

    const fetchSubDealers = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/sub-dealers?limit=1000`, {
                headers: {
                    Authorization: `Bearer ${user?.token}`
                }
            });
            const data = response.data.items || response.data;
            setSubDealers(data);
        } catch (error) {
            console.error('Error fetching sub-dealers:', error);
            toast.error('Failed to load sub-dealers');
        }
    };

    const handleAssignToSubDealer = async () => {
        if (!selectedSubDealer || selectedProductIds.length === 0) {
            toast.error('Please select products and a sub-dealer');
            return;
        }
        
        try {
            await axios.post(`${SUB_DEALER_API_URL}/bulk-assign`, {
                productIds: selectedProductIds,
                subDealerId: selectedSubDealer
            }, {
                headers: {
                    Authorization: `Bearer ${user?.token}`
                }
            });
            toast.success(`${selectedProductIds.length} products assigned to sub-dealer successfully`);
            setShowAssignModal(false);
            setSelectedProductIds([]);
            closeModelModal();
            fetchDealerProducts();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error assigning products');
            console.error('Error assigning products:', error);
        }
    };

    const fetchDealerProducts = async () => {
        if (!user || !entityId) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const url = isSubDealer 
                ? `${SUB_DEALER_API_URL}/${entityId}`
                : `${API_URL}/${entityId}/products`;
            
            const response = await axios.get(url);
            const fetchedProducts = Array.isArray(response.data) ? response.data : [];
            setProducts(fetchedProducts);

            const productsWithDetails = fetchedProducts.map(item => item.product).filter(Boolean);
            
            const uniqueModels = [...new Map(productsWithDetails
                .filter(p => p && p.model)
                .map(p => [p.model._id, p.model])
            ).values()];
            setModels(uniqueModels);

            const uniqueFactories = [...new Map(productsWithDetails
                .filter(p => p && p.factory)
                .map(p => [p.factory._id, p.factory])
            ).values()];
            setFactories(uniqueFactories);

        } catch (error) {
            toast.error('Error fetching products');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDealerProducts();
        if (!isSubDealer) {
            fetchSubDealers();
        }
    }, [user, entityId, isSubDealer]);

    const getSerialCounter = (serialNumber) => {
        if (!serialNumber) return 0;
        const match = serialNumber.match(/(\d+)$/);
        return match ? parseInt(match[1]) : 0;
    };

    const filteredProducts = useMemo(() => {
        return products.filter(item => {
            const product = item.product;
            if (!product) return false;
            
            // We only want to see unsold products in inventory
            if (product.sold) return false;

            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            const matchesSearch = (product.productName && product.productName.toLowerCase().includes(lowerCaseSearchTerm)) ||
                                 (product.serialNumber && product.serialNumber.toLowerCase().includes(lowerCaseSearchTerm)) ||
                                 (product.model && product.model.name.toLowerCase().includes(lowerCaseSearchTerm));
            
            const matchesModel = !modelFilter || product.model?._id === modelFilter;
            const matchesFactory = !factoryFilter || product.factory?._id === factoryFilter;
            
            return matchesSearch && matchesModel && matchesFactory;
        });
    }, [products, searchTerm, modelFilter, factoryFilter, isSubDealer]);

    const modelGroups = useMemo(() => {
        const map = {};
        filteredProducts.forEach(item => {
            const p = item.product;
            const mid = p.model?._id || 'unknown';
            if (!map[mid]) map[mid] = { model: p.model || { name: 'Unknown' }, count: 0, products: [] };
            map[mid].count += 1;
            map[mid].products.push(item);
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
        let filtered = filteredProducts
            .filter(item => item.product.model?._id === activeModelId)
            .map(item => ({
                ...item.product,
                distributorName: !isSubDealer ? (item.distributor?.name || 'N/A') : (item.dealer?.name || 'N/A')
            }));

        if (modalFactoryFilter !== 'all') {
            filtered = filtered.filter(p => p.factory?._id === modalFactoryFilter);
        }

        if (boxTypeFilter !== 'all') {
            filtered = filtered.filter(p => `${p.unitsPerBox}N` === boxTypeFilter);
        }

        return filtered.sort((a, b) => getSerialCounter(a.serialNumber) - getSerialCounter(b.serialNumber));
    }, [filteredProducts, activeModelId, modalFactoryFilter, boxTypeFilter, isSubDealer]);

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
            distributor: product.distributorName || 'N/A',
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
        if (!startSerialNumber || !endSerialNumber) {
            toast.error('Please enter both start and end serial numbers.');
            return;
        }
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

        if (selectedProducts.length === 0) {
            toast.error('No available products found in the specified range.');
            return;
        }

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

    const handleSale = async (saleData) => {
        const productIdsToSell = selectedProductIds;

        try {
            for (const productId of productIdsToSell) {
                await createSale({
                    productId: productId,
                    dealerId: !isSubDealer ? user.dealer._id : null,
                    subDealerId: isSubDealer ? user.subDealer._id : null,
                    ...saleData
                });
            }
            toast.success(`${productIdsToSell.length} product(s) sold successfully`);
            setShowSaleModal(false);
            setSelectedProductIds([]);
            closeModelModal();
            fetchDealerProducts();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error selling product');
            console.error('Error selling product:', error);
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
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={() => setShowScannerModal(true)}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                            >
                                Add product to Inventory
                            </button>
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
                transferLabel={isSubDealer ? "Sell" : "Assign/Sell"}
                onTransfer={() => isSubDealer ? setShowSaleModal(true) : setShowAssignModal(true)}
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
                            {!isSubDealer && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Sub Dealer</label>
                                    <div className="flex gap-2">
                                        <select
                                            value={selectedSubDealer}
                                            onChange={(e) => setSelectedSubDealer(e.target.value)}
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
                                        >
                                            <option value="">Select a sub-dealer</option>
                                            {subDealers.map(sd => (
                                                <option key={sd._id} value={sd._id}>{sd.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={handleAssignToSubDealer}
                                            disabled={!selectedSubDealer}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                                        >
                                            Assign
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className={!isSubDealer ? "border-t border-gray-200 pt-4" : "pt-2"}>
                                <button
                                    onClick={() => { setShowAssignModal(false); setShowSaleModal(true); }}
                                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                                >
                                    Sell directly to Customer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <SaleModal
                isOpen={showSaleModal}
                onClose={() => setShowSaleModal(false)}
                productSelection={selectedProductIds.map(id => {
                    const product = products.find(item => item.product?._id === id)?.product;
                    return {
                        _id: id,
                        productName: product?.model?.name || product?.productName || 'Unknown',
                        productsInBox: product ? [product] : []
                    };
                })}
                onSale={handleSale}
            />
        </div>
    );
}
