import React, { useState, useEffect, useMemo } from 'react';
import { useProducts } from './hooks/useProducts';
import InventoryManagementModal from './components/InventoryManagementModal';
import DistributorSelectionModal from './components/DistributorSelectionModal';
import EditProductModal from './components/EditProductModal';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Search, Box, Building } from 'lucide-react';
import { getFactories } from '../FactoryManagement/services/factoryService';
import { getModels } from '../Management/services/managementService';
import { FilterGroup, FilterItem, FilterSelector } from '../../global/FilterGroup';

const API_URL = import.meta.env.VITE_API_URL;

export default function Products() {
    const [modelFilter, setModelFilter] = useState('');
    const [factoryFilter, setFactoryFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [models, setModels] = useState([]);
    const [factories, setFactories] = useState([]);
    const { products, loading, fetchProducts } = useProducts(modelFilter, factoryFilter, searchTerm);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const modelsData = await getModels();
                setModels(modelsData);
                const factoriesData = await getFactories();
                setFactories(factoriesData);
            } catch (error) {
                toast.error("Failed to fetch models or factories");
            }
        };
        fetchInitialData();
    }, []);
    const [selectedProductIds, setSelectedProductIds] = useState([]);
    // Modal for distributor selection (used from inside model detail modal)
    const [isDistributorModalOpen, setIsDistributorModalOpen] = useState(false);
    // Modal for showing products of a particular model
    const [isModelModalOpen, setIsModelModalOpen] = useState(false);
    const [activeModelId, setActiveModelId] = useState(null);
    const [editingProduct, setEditingProduct] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    // Modal pagination (for model detail modal)
    const [modalCurrentPage, setModalCurrentPage] = useState(1);
    const [modalItemsPerPage, setModalItemsPerPage] = useState(10);
    const [startSerialNumber, setStartSerialNumber] = useState('');
    const [endSerialNumber, setEndSerialNumber] = useState('');
    // Range validation modal state
    const [rangeErrorModalOpen, setRangeErrorModalOpen] = useState(false);
    const [rangeErrorMessage, setRangeErrorMessage] = useState('');
    const [availableRange, setAvailableRange] = useState('');

    const [modalFactoryFilter, setModalFactoryFilter] = useState('all');
    const [boxTypeFilter, setBoxTypeFilter] = useState('all');

    // Outer pagination is for the model summary rows (modelGroups)

    const getSerialCounter = (serialNumber) => {
        if (!serialNumber) return 0;
        const match = serialNumber.match(/(\d+)$/);
        return match ? parseInt(match[1]) : 0;
    };

    const modalProducts = useMemo(() => {
        let filtered = products
            .filter(group => group.model?._id === activeModelId)
            .flatMap(group => group.productsInBox)
            .filter(product => !product.distributor);

        if (modalFactoryFilter !== 'all') {
            filtered = filtered.filter(product => product.factory?._id === modalFactoryFilter);
        }

        if (boxTypeFilter !== 'all') {
            filtered = filtered.filter(product => `${product.unitsPerBox}N` === boxTypeFilter);
        }

        return filtered.sort((a, b) => getSerialCounter(a.serialNumber) - getSerialCounter(b.serialNumber));
    }, [products, activeModelId, modalFactoryFilter, boxTypeFilter]);

    const modalTotalPages = useMemo(() => Math.ceil(modalProducts.length / modalItemsPerPage) || 1, [modalProducts, modalItemsPerPage]);
    const paginatedModalProducts = useMemo(() => {
        const indexOfLastItem = modalCurrentPage * modalItemsPerPage;
        const indexOfFirstItem = indexOfLastItem - modalItemsPerPage;
        return modalProducts.slice(indexOfFirstItem, indexOfLastItem);
    }, [modalProducts, modalCurrentPage, modalItemsPerPage]);

    const handleProductSelect = (productIds, isSelected) => {
        const ids = Array.isArray(productIds) ? productIds : [productIds];
        if (isSelected) {
            setSelectedProductIds(prev => [...new Set([...prev, ...ids])]);
        } else {
            setSelectedProductIds(prev => prev.filter(id => !ids.includes(id)));
        }
    };

    const openDistributorModal = () => setIsDistributorModalOpen(true);
    const closeDistributorModal = () => setIsDistributorModalOpen(false);

    const handleEditProduct = (productId) => {
        // Find the product in modalProducts
        const product = modalProducts.find(p => p._id === productId);
        if (product) {
            setEditingProduct(product);
            setIsEditModalOpen(true);
        }
    };

    const openModelModal = (modelId) => {
        // Clear previous selection when opening model-specific view
        setSelectedProductIds([]);
        setActiveModelId(modelId);
        setModalFactoryFilter('all');
        setBoxTypeFilter('all');
        setStartSerialNumber('');
        setEndSerialNumber('');
        setModalCurrentPage(1);
        setIsModelModalOpen(true);
    };

    const closeModelModal = () => {
        setIsModelModalOpen(false);
        setActiveModelId(null);
        setSelectedProductIds([]);
        setModalFactoryFilter('all');
        setBoxTypeFilter('all');
        setStartSerialNumber('');
        setEndSerialNumber('');
    };

    const handleAssignProducts = async (distributorId) => {
        try {
            await axios.put(`${API_URL}/api/distributor/products/assign`, {
                productIds: selectedProductIds,
                distributorId: distributorId
            });
            toast.success('Products assigned successfully!');
        } catch (error) {
            toast.error('Error assigning products');
            console.error('Error assigning products:', error);
        } finally {
            closeDistributorModal();
            setSelectedProductIds([]);
            fetchProducts();
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

        // Validate against available (unassigned) products
        const available = modalProducts;
        const counters = available.map(i => getSerialCounter(i.serialNumber)).filter(n => n > 0);
        if (counters.length > 0) {
            const minCounter = Math.min(...counters);
            const maxCounter = Math.max(...counters);
            if (startCounter < minCounter || endCounter > maxCounter) {
                const sorted = available.slice().sort((a, b) => getSerialCounter(a.serialNumber) - getSerialCounter(b.serialNumber));
                const minSerial = sorted[0]?.serialNumber || '';
                const maxSerial = sorted[sorted.length - 1]?.serialNumber || '';
                setRangeErrorMessage('Selected range exceeds available range');
                setAvailableRange(`${minSerial} - ${maxSerial}`);
                setRangeErrorModalOpen(true);
                return;
            }
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
        if (!startSerialNumber || !endSerialNumber) {
            toast.error('Please enter both start and end serial numbers to unselect.');
            return;
        }
        const startCounter = getSerialCounter(startSerialNumber);
        const endCounter = getSerialCounter(endSerialNumber);
        if (startCounter === 0 || endCounter === 0 || startCounter > endCounter) {
            toast.error('Invalid serial number format or range.');
            return;
        }

        // Validate against available (unassigned) products
        const available = modalProducts;
        const counters = available.map(i => getSerialCounter(i.serialNumber)).filter(n => n > 0);
        if (counters.length > 0) {
            const minCounter = Math.min(...counters);
            const maxCounter = Math.max(...counters);
            if (startCounter < minCounter || endCounter > maxCounter) {
                const sorted = available.slice().sort((a, b) => getSerialCounter(a.serialNumber) - getSerialCounter(b.serialNumber));
                const minSerial = sorted[0]?.serialNumber || '';
                const maxSerial = sorted[sorted.length - 1]?.serialNumber || '';
                setRangeErrorMessage('Selected range exceeds available range');
                setAvailableRange(`${minSerial} - ${maxSerial}`);
                setRangeErrorModalOpen(true);
                return;
            }
        }

        const unselectedProductIds = modalProducts
            .filter(product => {
                const itemCounter = getSerialCounter(product.serialNumber);
                return itemCounter >= startCounter && itemCounter <= endCounter;
            })
            .map(p => p._id);

        if (unselectedProductIds.length === 0) {
            toast.error('No products found in the specified range to unselect.');
            return;
        }

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

    // Build model-level groups from the flattened product list
    const flattenedProducts = useMemo(() => products.flatMap(g => g.productsInBox).filter(p => !p.distributor), [products]);

    const modelGroups = useMemo(() => {
        const map = {};
        flattenedProducts.forEach(p => {
            const mid = p.model?._id || 'unknown';
            if (!map[mid]) map[mid] = { model: p.model || { name: 'Unknown' }, count: 0, products: [] };
            map[mid].count += 1;
            map[mid].products.push(p);
        });
        return Object.values(map);
    }, [flattenedProducts]);

    const totalPages = useMemo(() => Math.ceil(modelGroups.length / itemsPerPage) || 1, [modelGroups, itemsPerPage]);
    const paginatedModelGroups = useMemo(() => {
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return modelGroups.slice(indexOfFirstItem, indexOfLastItem);
    }, [modelGroups, currentPage, itemsPerPage]);

    const modalRows = useMemo(() => (
        paginatedModalProducts.map(product => ({
            id: product._id,
            checked: selectedProductIds.includes(product._id),
            model: product.model?.name || product.productName || 'N/A',
            boxType: `${product.unitsPerBox || ''}N`,
            serialNumber: product.serialNumber || 'N/A',
            mrp: `${product.price} /- Each`,
            factory: product.factory?.name || 'N/A',
            distributor: product.distributor?.name || 'N/A',
        }))
    ), [paginatedModalProducts, selectedProductIds]);

    const visibleModalProductIds = useMemo(
        () => paginatedModalProducts.map(product => product._id),
        [paginatedModalProducts],
    );

    const allVisibleModalRowsSelected = visibleModalProductIds.length > 0 &&
        visibleModalProductIds.every(id => selectedProductIds.includes(id));

    const handleToggleAllModalRows = (isSelected) => {
        handleProductSelect(visibleModalProductIds, isSelected);
    };

    return (
        <div className="p-4 lg:p-4 min-h-full">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 lg:p-6">
                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between space-y-4 xl:space-y-0">
                        <div className="flex-shrink-0">
                            <h2 className="text-lg font-semibold text-gray-900">Inventory</h2>
                            <p className="text-sm text-gray-600">Total Products: {flattenedProducts.length}</p>
                        </div>
                        <div className="flex-gro">
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
                {flattenedProducts.length === 0 && !loading ? (
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
                                            <td>
                                            <button
                                                onClick={() => { setModalCurrentPage(1); openModelModal(mg.model?._id); }}
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
                    onTransfer={openDistributorModal}
                    rows={modalRows}
                    allRowsSelected={allVisibleModalRowsSelected}
                    onToggleAllRows={handleToggleAllModalRows}
                    onRowToggle={(rowId, isChecked) => handleProductSelect(rowId, isChecked)}
                    onEdit={handleEditProduct}
                    showingFrom={modalProducts.length > 0 ? (modalCurrentPage - 1) * modalItemsPerPage + 1 : 0}
                    showingTo={Math.min(modalCurrentPage * modalItemsPerPage, modalProducts.length)}
                    totalItems={modalProducts.length}
                />

                <DistributorSelectionModal
                    isOpen={isDistributorModalOpen}
                    onClose={closeDistributorModal}
                    onAssign={handleAssignProducts}
                />
                <EditProductModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    product={editingProduct}
                    onUpdate={fetchProducts}
                />
                {rangeErrorModalOpen && (
                    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/40" onClick={() => setRangeErrorModalOpen(false)}></div>
                        <div className="bg-white rounded-lg shadow-lg z-70 w-full max-w-md p-6 mx-4">
                            <div className="flex items-start justify-between">
                                <h4 className="text-lg font-semibold">Range Error</h4>
                                <button onClick={() => setRangeErrorModalOpen(false)} className="text-gray-500 hover:text-gray-700">Close</button>
                            </div>
                            <div className="mt-4 text-sm text-gray-700">
                                <p>{rangeErrorMessage} <span className="font-medium">({availableRange})</span></p>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button onClick={() => setRangeErrorModalOpen(false)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">OK</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
    );
}
