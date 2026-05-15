import { useEffect, useMemo, useState } from 'react';
import { Box } from 'lucide-react';
import { DealerFilters } from '../Dealers/components/DealerFilters';
import { dealerService } from '../Dealers/services/dealerService';
import { toast } from 'react-hot-toast';
import axios from 'axios';

export default function ExecutiveDealers() {
    const [searchTerm, setSearchTerm] = useState('');
    const [dealers, setDealers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [distributors, setDistributors] = useState([]);
    const [states, setStates] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [stateFilter, setStateFilter] = useState('all');
    const [distributorFilter, setDistributorFilter] = useState('all');

    useEffect(() => {
        const fetchDealers = async () => {
            try {
                setLoading(true);
                const response = await dealerService.fetchDealers(searchTerm);
                setDealers(response.data);
            } catch (error) {
                toast.error('Error fetching dealers');
            } finally {
                setLoading(false);
            }
        };

        const debounce = setTimeout(fetchDealers, 300);
        return () => clearTimeout(debounce);
    }, [searchTerm]);

    useEffect(() => {
        dealerService.fetchDistributors().then((response) => setDistributors(response.data)).catch(() => toast.error('Error fetching distributors'));
        axios.get(`${import.meta.env.VITE_API_URL}/api/locations/states`).then((response) => setStates(response.data)).catch(() => {});
    }, []);

    const filteredDealers = useMemo(() => {
        return dealers.filter(dealer => {
            const searchLower = searchTerm.toLowerCase();
            const matchSearch = (
                dealer.name?.toLowerCase().includes(searchLower) ||
                dealer.dealerId?.toLowerCase().includes(searchLower) ||
                dealer.city?.toLowerCase().includes(searchLower) ||
                dealer.distributor?.name?.toLowerCase().includes(searchLower)
            );

            const matchState = stateFilter === 'all' || dealer.state === stateFilter;
            const matchDistributor = distributorFilter === 'all' || dealer.distributor?._id === distributorFilter;

            return matchSearch && matchState && matchDistributor;
        });
    }, [dealers, searchTerm, stateFilter, distributorFilter]);

    const totalPages = Math.ceil(filteredDealers.length / itemsPerPage) || 1;
    const currentItems = useMemo(() => {
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return filteredDealers.slice(indexOfFirstItem, indexOfLastItem);
    }, [filteredDealers, currentPage, itemsPerPage]);

    return (
        <div className="p-2">
            <div className="p-2">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="p-4 sm:p-6 border-b border-gray-200">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Dealer List</h2>
                                <p className="text-sm text-gray-600">Total {filteredDealers.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 sm:p-6 border-b border-gray-200">
                        <DealerFilters
                            searchTerm={searchTerm}
                            onSearchChange={setSearchTerm}
                            stateFilter={stateFilter}
                            onStateFilterChange={setStateFilter}
                            distributorFilter={distributorFilter}
                            onDistributorFilterChange={setDistributorFilter}
                            states={states}
                            distributors={distributors}
                            onClearFilters={() => {
                                setSearchTerm('');
                                setStateFilter('all');
                                setDistributorFilter('all');
                            }}
                        />
                    </div>

                    <div className="p-4">
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4d55f5] mx-auto"></div>
                                <p className="mt-4 text-gray-500">Loading dealers...</p>
                            </div>
                        ) : filteredDealers.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">No dealers found.</div>
                        ) : (
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distributor</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {currentItems.map((dealer) => (
                                            <tr key={dealer._id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{dealer.dealerId}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dealer.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dealer.city}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dealer.distributor?.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="inline-flex items-center px-2.5 py-1.5 border border-[#4d55f5] text-xs font-medium rounded text-[#4d55f5]">
                                                        <Box className="h-4 w-4 mr-1" />
                                                        {dealer.productCount || 0} Products
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="px-6 py-3 border-t border-gray-200 flex flex-col md:flex-row items-center md:justify-between gap-3 md:gap-0">
                        <div className="w-full md:w-auto flex items-center justify-between md:justify-start text-sm text-gray-700 space-x-2">
                            <div className="flex items-center space-x-2">
                                <span className="whitespace-nowrap">Rows per page:</span>
                                <select
                                    className="ml-2 border border-gray-300 rounded px-2 py-1"
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

                            <div className="hidden md:block text-sm text-gray-700">
                                Showing {currentItems.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredDealers.length)} of {filteredDealers.length} dealers
                            </div>
                        </div>

                        <div className="w-full md:w-auto flex items-center justify-between md:justify-end space-x-2">
                            <div className="text-sm text-gray-700 md:hidden">Page {currentPage} of {totalPages}</div>

                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
                                >
                                    Previous
                                </button>

                                <span className="text-sm text-gray-700 hidden md:inline">Page {currentPage} of {totalPages}</span>

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
                </div>
            </div>
        </div>
    );
}
