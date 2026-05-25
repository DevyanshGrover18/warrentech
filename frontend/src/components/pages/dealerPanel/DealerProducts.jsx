import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import DealerProductGroupList from '../Dealers/components/DealerProductGroupList';
import DealerQRScannerModal from '../../global/DealerQRScannerModal';
import SaleModal from '../Dealers/components/SaleModal';
import { createSale } from '../Dealers/services/dealerSalesService';
import { groupProductsByConfiguration } from '../Distributors/utils';
import { ProductFilters } from '../Distributors/components/ProductFilters';

const API_URL = `${import.meta.env.VITE_API_URL}/api/distributor-dealer-products/dealer`;

export default function DealerProducts() {
    const { user } = useContext(AuthContext);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showScannerModal, setShowScannerModal] = useState(false);
    const [selectedProductGroups, setSelectedProductGroups] = useState([]);
    const [showSaleModal, setShowSaleModal] = useState(false);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [modelFilter, setModelFilter] = useState('all');
    const [startSerialNumber, setStartSerialNumber] = useState('');
    const [endSerialNumber, setEndSerialNumber] = useState('');
    const [models, setModels] = useState([]);

    const fetchDealerProducts = async () => {
        if (!user || !user.dealer) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/${user.dealer._id}/products`);
            const fetchedProducts = response.data;
            setProducts(fetchedProducts);

            const productsWithDetails = fetchedProducts.map(item => item.product);
            
            const uniqueModels = [...new Map(productsWithDetails
                .filter(p => p.model)
                .map(p => [p.model._id, p.model])
            ).values()];
            
            setModels(uniqueModels);

        } catch (error) {
            toast.error('Error fetching dealer products');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDealerProducts();
    }, [user]);

    const getSerialCounter = (serialNumber) => {
        if (!serialNumber) return 0;
        const match = serialNumber.match(/(\d+)$/);
        return match ? parseInt(match[1]) : 0;
    };

    const filteredProducts = products.filter(item => {
        const product = item.product;
        if (!product) return false;

        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        
        const matchesSearch = (product.productName && product.productName.toLowerCase().includes(lowerCaseSearchTerm)) ||
                             (product.serialNumber && product.serialNumber.toLowerCase().includes(lowerCaseSearchTerm)) ||
                             (product.model && product.model.name.toLowerCase().includes(lowerCaseSearchTerm));
        
        const matchesModel = modelFilter === 'all' || product.model?._id === modelFilter;
        
        return matchesSearch && matchesModel;
    });

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

        const productsWithDistributor = filteredProducts.map(item => ({
            ...item.product,
            distributorName: item.distributor?.name || 'N/A',
        }));
        const groupedProducts = groupProductsByConfiguration(productsWithDistributor);
        
        const productsInRange = groupedProducts.filter(group => {
            return group.productsInBox.some(product => {
                const productCounter = getSerialCounter(product.serialNumber);
                return productCounter >= startCounter && productCounter <= endCounter;
            });
        });
        
        if (productsInRange.length === 0) {
            toast.error('No products found in the specified range.');
            return;
        }
        
        const newSelection = [...selectedProductGroups];
        productsInRange.forEach(group => {
            if (!newSelection.some(selected => selected._id === group._id)) {
                newSelection.push(group);
            }
        });
        
        setSelectedProductGroups(newSelection);
        toast.success(`Selected ${productsInRange.length} product groups in range`);
    };

    const handleClearRange = () => {
        setStartSerialNumber('');
        setEndSerialNumber('');
    };

    const clearFilters = () => {
        setSearchTerm('');
        setModelFilter('all');
        handleClearRange();
        setSelectedProductGroups([]);
    };

    const handleSale = async (saleData) => {
        const { customerName, customerPhone, customerEmail, customerAddress, customerState, customerCity, plumberName, plumberPhone, productSelection } = saleData;

        if (!productSelection || productSelection.length === 0) return;

        const productIdsToSell = productSelection.flatMap(group =>
            group.productsInBox.map(product => product._id)
        );

        try {
            for (const productId of productIdsToSell) {
                await createSale({
                    productId: productId,
                    dealerId: user.dealer._id,
                    customerName,
                    customerPhone,
                    customerEmail,
                    customerAddress,
                    customerState,
                    customerCity,
                    plumberName,
                    plumberPhone
                });
            }
            toast.success(`${productIdsToSell.length} product(s) sold successfully`);
            setShowSaleModal(false);
            setSelectedProductGroups([]);
            fetchDealerProducts();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error selling product');
            console.error('Error selling product:', error);
        }
    };

    return (
        <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Products</h1>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setShowScannerModal(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    >
                        Add product to Inventory
                    </button>
                    <button
                        onClick={() => setShowSaleModal(true)}
                        disabled={selectedProductGroups.length === 0}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                        Sell Products ({selectedProductGroups.length})
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <ProductFilters
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    modelFilter={modelFilter}
                    onModelFilterChange={setModelFilter}
                    startSerialNumber={startSerialNumber}
                    onStartSerialNumberChange={setStartSerialNumber}
                    endSerialNumber={endSerialNumber}
                    onEndSerialNumberChange={setEndSerialNumber}
                    onSelectRange={handleSelectRange}
                    onClearRange={handleClearRange}
                    models={models}
                    onClearFilters={clearFilters}
                />
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4d55f5] mx-auto"></div>
                        <p className="mt-4 text-gray-500">Loading products...</p>
                    </div>
                ) : (
                    <DealerProductGroupList 
                        products={filteredProducts} 
                        selectedProductGroups={selectedProductGroups}
                        setSelectedProductGroups={setSelectedProductGroups}
                    />
                )}
            </div>
            <DealerQRScannerModal
                isOpen={showScannerModal}
                onClose={() => setShowScannerModal(false)}
                onProductAssigned={fetchDealerProducts}
            />
            <SaleModal
                isOpen={showSaleModal}
                onClose={() => setShowSaleModal(false)}
                productSelection={selectedProductGroups}
                onSale={handleSale}
            />
        </div>
    );
}
