import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { ProductFilters } from '../Distributors/components/ProductFilters';
import { groupProductsByConfiguration } from '../Distributors/utils';

export default function ExecutiveInventory() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [factoryFilter, setFactoryFilter] = useState('all');
    const [modelFilter, setModelFilter] = useState('all');
    const [startSerialNumber, setStartSerialNumber] = useState('');
    const [endSerialNumber, setEndSerialNumber] = useState('');
    const [factories, setFactories] = useState([]);
    const [models, setModels] = useState([]);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/sales/assigned-products`);
                setProducts(data);

                const uniqueFactories = [...new Map(data
                    .filter(product => product.factory)
                    .map(product => [product.factory._id, product.factory])
                ).values()];

                const uniqueModels = [...new Map(data
                    .filter(product => product.model)
                    .map(product => [product.model._id, product.model])
                ).values()];

                setFactories(uniqueFactories);
                setModels(uniqueModels);
            } catch (error) {
                toast.error('Error fetching inventory');
            } finally {
                setLoading(false);
            }
        };

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

            const matchesFactory = factoryFilter === 'all' || product.factory?._id === factoryFilter;
            const matchesModel = modelFilter === 'all' || product.model?._id === modelFilter;

            return matchesSearch && matchesFactory && matchesModel;
        });
    }, [products, searchTerm, factoryFilter, modelFilter]);

    const groupedProducts = useMemo(() => groupProductsByConfiguration(filteredProducts), [filteredProducts]);
    const totalPages = Math.ceil(groupedProducts.length / itemsPerPage) || 1;
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = groupedProducts.slice(indexOfFirstItem, indexOfLastItem);

    const clearFilters = () => {
        setSearchTerm('');
        setFactoryFilter('all');
        setModelFilter('all');
        setStartSerialNumber('');
        setEndSerialNumber('');
        setCurrentPage(1);
    };

    return (
        <div className="p-2 sm:p-6 space-y-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-3 sm:p-6 border-b border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Inventory</h2>
                            <p className="text-sm text-gray-600">Assigned items: {filteredProducts.length}</p>
                        </div>
                    </div>
                </div>

                <div className="p-3 sm:p-6 border-b border-gray-200">
                    <ProductFilters
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        factoryFilter={factoryFilter}
                        onFactoryFilterChange={setFactoryFilter}
                        modelFilter={modelFilter}
                        onModelFilterChange={setModelFilter}
                        startSerialNumber={startSerialNumber}
                        onStartSerialNumberChange={setStartSerialNumber}
                        endSerialNumber={endSerialNumber}
                        onEndSerialNumberChange={setEndSerialNumber}
                        onSelectRange={() => {}}
                        onClearRange={() => {
                            setStartSerialNumber('');
                            setEndSerialNumber('');
                        }}
                        factories={factories}
                        models={models}
                        onClearFilters={clearFilters}
                    />
                </div>

                <div className="relative min-h-[200px]">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4d55f5] mx-auto"></div>
                            <p className="mt-4 text-gray-500">Loading products...</p>
                        </div>
                    ) : currentItems.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">No assigned products found.</div>
                    ) : (
                        <div className="p-4 overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order / Box</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factory</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distributor</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dealer</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sold</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {currentItems.map((group) => {
                                        const firstProduct = group.productsInBox[0];
                                        const soldCount = group.productsInBox.filter(product => product.sold).length;
                                        return (
                                            <tr key={group._id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{group.orderId} / {group.boxNumber}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{group.model?.name || firstProduct?.model?.name || '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{group.factory?.name || firstProduct?.factory?.name || '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{firstProduct?.distributor?.name || '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{firstProduct?.dealer?.name || '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{group.productsInBox.length}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{soldCount} / {group.productsInBox.length}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="p-3 sm:px-6 sm:py-3 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
                    <div className="text-sm text-gray-700 w-full sm:w-auto flex items-center space-x-2">
                        <span>Rows per page:</span>
                        <select
                            className="border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                        >
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="75">75</option>
                            <option value="100">100</option>
                        </select>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                        <span className="text-sm text-gray-700 hidden sm:inline">
                            Showing {currentItems.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, groupedProducts.length)} of {groupedProducts.length} product groups
                        </span>
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors min-w-[100px] flex items-center justify-center"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-gray-700 flex-shrink-0">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors min-w-[100px] flex items-center justify-center"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
