import { useEffect, useMemo, useState } from 'react';
import { Search, Box } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export default function ExecutiveDistributors() {
    const [searchTerm, setSearchTerm] = useState('');
    const [distributors, setDistributors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const fetchDistributors = async () => {
        try {
            setLoading(true);
            const response = await axios.get(searchTerm ? `${import.meta.env.VITE_API_URL}/api/distributors?search=${searchTerm}` : `${import.meta.env.VITE_API_URL}/api/distributors`);
            setDistributors(response.data);
        } catch (error) {
            toast.error('Error fetching distributors');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const debounce = setTimeout(fetchDistributors, 300);
        return () => clearTimeout(debounce);
    }, [searchTerm]);

    const totalPages = useMemo(() => Math.ceil(distributors.length / itemsPerPage) || 1, [distributors, itemsPerPage]);
    const currentItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return distributors.slice(startIndex, startIndex + itemsPerPage);
    }, [distributors, currentPage, itemsPerPage]);

    return (
        <div className="p-2">
            <div className="p-2">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="p-4 lg:p-6 border-b border-gray-200">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">Distributor List</h2>
                                <p className="text-sm text-gray-600">Total {distributors.length}</p>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full lg:w-auto pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-4">
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4d55f5] mx-auto"></div>
                                <p className="mt-4 text-gray-500">Loading distributors...</p>
                            </div>
                        ) : (
                            <div className="hidden md:block overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GST Number</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products Count</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {currentItems.map((distributor) => (
                                            <tr key={distributor._id} className="hover:bg-gray-50">
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{distributor.distributorId}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{distributor.name}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{distributor.city}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{distributor.gstNumber}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <div>
                                                        <p>{distributor.contactPerson}</p>
                                                        <p className="text-gray-500">{distributor.contactPhone}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="inline-flex items-center px-2.5 py-1.5 border border-[#4d55f5] text-xs font-medium rounded text-[#4d55f5]">
                                                        <Box className="h-4 w-4 mr-1" />
                                                        {distributor.productCount || 0} Products
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {!loading && (
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
                                    Showing {currentItems.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, distributors.length)} of {distributors.length} distributors
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
                    )}
                </div>
            </div>
        </div>
    );
}
