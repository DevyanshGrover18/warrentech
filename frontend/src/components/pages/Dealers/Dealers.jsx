import React, { useEffect, useState, useMemo } from 'react';
import { Plus, X, FilePenLine, Trash2, Box } from 'lucide-react';
import ListComponent from '../../global/ListComponent';
import ErrorBoundary from '../../global/ErrorBoundary';
import { useDealers } from './hooks/useDealers';
import { distributorDealerProductService } from '../../../services/distributorDealerProductService';
import { toast } from 'react-hot-toast';
import axios from 'axios';

import DealerProductGroupList from './components/DealerProductGroupList';
import { DealerFilters } from './components/DealerFilters';
import ExportToExcelButton from '../../global/ExportToExcelButton';
import ExportToPdfButton from '../../global/ExportToPdfButton';
import { confirmDelete } from '../../global/deleteConfirm';
import WalletDetailsModal from '../Wallets/components/WalletDetailsModal';
import WalletIconButton from '../Wallets/components/WalletIconButton';

function Dealers() {
    const {
        searchTerm,
        setSearchTerm,
        dealers,
        loading,
        distributors,
        addDealer,
        updateDealer,
        deleteDealer,
    } = useDealers();

    const [showDealerModal, setShowDealerModal] = useState(false);
    const [selectedDealer, setSelectedDealer] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showProductsModal, setShowProductsModal] = useState(false);
    const [dealerProducts, setDealerProducts] = useState([]);
    const [states, setStates] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedDealers, setSelectedDealers] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [stateFilter, setStateFilter] = useState('all');
    const [distributorFilter, setDistributorFilter] = useState('all');
    const [selectedWalletDealer, setSelectedWalletDealer] = useState(null);

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

    const totalPages = useMemo(() => Math.ceil(filteredDealers.length / itemsPerPage), [filteredDealers, itemsPerPage]);
    const currentItems = useMemo(() => {
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return filteredDealers.slice(indexOfFirstItem, indexOfLastItem);
    }, [filteredDealers, currentPage, itemsPerPage]);
    
    const [newDealer, setNewDealer] = useState({
        name: '',
        address: '',
        state: '',
        city: '',
        contactPerson: '',
        contactPhone: '',
        email: '',
        status: 'Active',
        distributor: '', // Initialize distributor field
        username: '',
        password: ''
    });

    const [cities, setCities] = useState([]);

    const dealerColumns = [
        { header: 'ID', accessor: 'ID' },
        { header: 'Name', accessor: 'Name' },
        { header: 'City', accessor: 'City' },
        { header: 'Distributor', accessor: 'Distributor' },
        { header: 'Products Count', accessor: 'Products Count' },
    ];

    const getExportData = () => {
        return filteredDealers.map(dealer => ({
            'ID': dealer.dealerId,
            'Name': dealer.name,
            'City': dealer.city,
            'Distributor': dealer.distributor?.name || 'N/A',
            'Products Count': dealer.productCount || 0,
        }));
    };

    useEffect(() => {
        const fetchStates = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/locations/states`);
                setStates(response.data);
            } catch (error) {
                console.error('Error fetching states:', error);
            }
        };
        fetchStates();
    }, []);

    const fetchCities = async (state) => {
        if (!state) return;
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/locations/cities/${state}`);
            setCities(response.data);
        } catch (error) {
            console.error(`Error fetching cities for ${state}:`, error);
        }
    };

    useEffect(() => {
        if (newDealer.state) {
            fetchCities(newDealer.state);
        }
    }, [newDealer.state]);

    const handleAddEditDealer = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        let success;
        if (isEditing) {
            success = await updateDealer(selectedDealer._id, newDealer);
        } else {
            success = await addDealer(newDealer);
        }
        if (success) {
            handleModalClose();
        }
        setIsSubmitting(false);
    };

    const handleEditClick = (dealer) => {
        setSelectedDealer(dealer);
        setNewDealer({
            name: dealer.name,
            address: dealer.address,
            state: dealer.state,
            city: dealer.city,
            contactPerson: dealer.contactPerson,
            contactPhone: dealer.contactPhone,
            email: dealer.email,
            status: dealer.status,
            distributor: dealer.distributor?._id || '', // Set distributor ID for editing
            username: dealer.username || '',
            password: '' // Keep password empty for security
        });
        setIsEditing(true);
        setShowDealerModal(true);
    };

    const handleModalClose = () => {
        setShowDealerModal(false);
        setSelectedDealer(null);
        setIsEditing(false);
        setNewDealer({
            name: '',
            address: '',
            state: '',
            city: '',
            contactPerson: '',
            contactPhone: '',
            email: '',
            status: 'Active',
            distributor: ''
        });
    };

    const handleViewProducts = async (dealer) => {
        try {
            const { data } = await distributorDealerProductService.getDealerProducts(dealer._id);
            setDealerProducts(data);
            setSelectedDealer(dealer);
            setShowProductsModal(true);
        } catch (error) {
            toast.error('Error fetching dealer products');
            console.error('Error:', error);
        }
    };

    const handleSelect = (id) => {
        setSelectedDealers(prev =>
            prev.includes(id) ? prev.filter(dealerId => dealerId !== id) : [...prev, id]
        );
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedDealers(dealers.map(d => d._id));
        } else {
            setSelectedDealers([]);
        }
    };

    const handleDeleteSelected = async () => {
        const confirmed = await confirmDelete({
            entityLabel: 'dealer',
            entityLabelPlural: 'dealers',
            count: selectedDealers.length,
        });

        if (!confirmed) return;

        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/dealers`, { data: { dealerIds: selectedDealers } });
            window.location.reload();
            toast.success('Selected dealers deleted successfully');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error deleting dealers');
        }
    };

    const openWalletModal = (dealer) => {
        setSelectedWalletDealer({
            entityType: 'dealer',
            entityId: dealer._id,
            entityName: dealer.name,
        });
    };

    return (
        <div className="p-2">
            <div className="p-2">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="p-4 sm:p-6 border-b border-gray-200">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Dealer List</h2>
                                <p className="text-sm text-gray-600">
                                    Total {filteredDealers.length}
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                                <div className="flex items-center space-x-2">
                                    <ExportToExcelButton getData={getExportData} filename="dealers-export" />
                                    <ExportToPdfButton getData={getExportData} columns={dealerColumns} filename="dealers-export" />
                                </div>
                                {selectedDealers.length > 0 ? (
                                    <button
                                        onClick={handleDeleteSelected}
                                        className="flex items-center justify-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        <span>Delete ({selectedDealers.length})</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setShowDealerModal(true)}
                                        className="flex items-center justify-center space-x-2 bg-[#4d55f5] text-white px-4 py-2 rounded-lg hover:bg-[#3d45e5] transition-colors"
                                    >
                                        <Plus className="h-4 w-4" />
                                        <span>Add Dealer</span>
                                    </button>
                                )}
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
                        ) : dealers.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                No dealers found.
                            </div>
                        ) : (
                            <>
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    <input type="checkbox" onChange={handleSelectAll} checked={selectedDealers.length === dealers.length && dealers.length > 0} />
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State</th> */}
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                                                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th> */}
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distributor</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                                                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th> */}
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <ListComponent
                                            items={currentItems}
                                            renderItem={(dealer) => (
                                                <>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        <input type="checkbox" checked={selectedDealers.includes(dealer._id)} onChange={() => handleSelect(dealer._id)} />
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{dealer.dealerId}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dealer.name}</td>
                                                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dealer.address}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dealer.state}</td> */}
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dealer.city}</td>
                                                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        <div>
                                                            <p>{dealer.contactPerson}</p>
                                                            <p className="text-gray-500">{dealer.contactPhone}</p>
                                                        </div>
                                                    </td> */}
                                                    
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dealer.distributor?.name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <button
                                                            onClick={() => handleViewProducts(dealer)}
                                                            className="inline-flex items-center px-2.5 py-1.5 border border-[#4d55f5] text-xs font-medium rounded text-[#4d55f5] hover:bg-[#4d55f5] hover:text-white transition-colors"
                                                        >
                                                            <Box className="h-4 w-4 mr-1" />
                                                            {dealer.productCount || 0} Products
                                                        </button>
                                                    </td>
                                                    {/* <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                            dealer.status === 'Active'
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-red-100 text-red-800'
                                                        }`}>
                                                            {dealer.status}
                                                        </span>
                                                    </td> */}
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        <div className="flex items-center space-x-2">
                                                            <WalletIconButton onClick={() => openWalletModal(dealer)} />
                                                            <button 
                                                                onClick={() => handleEditClick(dealer)}
                                                                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                                                            >
                                                                <FilePenLine size={20} className="text-gray-500" />
                                                            </button>
                                                            <button 
                                                                onClick={() => deleteDealer(dealer._id)}
                                                                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                                                            >
                                                                <Trash2 size={20} className="text-red-500" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                            itemContainer="tr"
                                            listContainer="tbody"
                                            itemClassName="hover:bg-gray-50"
                                            listClassName="bg-white divide-y divide-gray-200"
                                        />
                                    </table>
                                </div>



                                <div className="md:hidden space-y-4">
                                    {dealers.length > 0 ? (
                                        <ListComponent
                                            items={dealers}
                                            renderItem={(dealer) => (
                                                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                                    <div className="flex justify-between items-start">
                                                        <h3 className="font-medium text-gray-900">{dealer.name}</h3>
                                                        <div className="flex items-center space-x-2">
                                                            <WalletIconButton onClick={() => openWalletModal(dealer)} />
                                                            <button 
                                                                onClick={() => handleEditClick(dealer)}
                                                                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                                                            >
                                                                <FilePenLine size={20} className="text-gray-500" />
                                                            </button>
                                                            <button 
                                                                onClick={() => deleteDealer(dealer._id)}
                                                                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                                                            >
                                                                <Trash2 size={20} className="text-red-500" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-gray-600">{dealer.dealerId}</p>
                                                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                                                        <div><span className="font-medium">Address:</span> {dealer.address}</div>
                                                        <div><span className="font-medium">State:</span> {dealer.state}</div>
                                                        <div><span className="font-medium">City:</span> {dealer.city}</div>
                                                        <div><span className="font-medium">Contact:</span> {dealer.contactPerson}</div>
                                                        <div><span className="font-medium">Phone:</span> {dealer.contactPhone}</div>
                                                        <div className="col-span-2">
                                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                                dealer.status === 'Active'
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-red-100 text-red-800'
                                                            }`}>
                                                                {dealer.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            itemContainer="div"
                                            listContainer="div"
                                            listClassName="space-y-4"
                                        />
                                    ) : (
                                        <div className="text-center py-12 text-gray-500">No dealers found</div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                    {dealers.length > 0 && (
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

                                {/* Hide verbose range on small screens */}
                                <div className="hidden md:block text-sm text-gray-700">
                                    Showing {currentItems.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, dealers.length)} of {dealers.length} dealers
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

            {showDealerModal && (
                <div className="fixed inset-0 bg-black/80 bg-opacity-20 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-4 sm:p-6 lg:p-8 w-full max-w-4xl max-h-[95vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {isEditing ? 'Edit Dealer' : 'Add New Dealer'}
                            </h3>
                            <button
                                onClick={handleModalClose}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <form onSubmit={handleAddEditDealer}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={newDealer.name}
                                        onChange={(e) => setNewDealer({...newDealer, name: e.target.value})}
                                        placeholder="Enter dealer name"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                                    <input
                                        type="text"
                                        required
                                        value={newDealer.address}
                                        onChange={(e) => setNewDealer({...newDealer, address: e.target.value})}
                                        placeholder="Enter address"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
                                    <select
                                        required
                                        value={newDealer.state}
                                        onChange={(e) => {
                                            setNewDealer({...newDealer, state: e.target.value, city: ''});
                                            fetchCities(e.target.value);
                                        }}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
                                    >
                                        <option value="">Select State</option>
                                        {states.map(state => (
                                            <option key={state} value={state}>{state}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                                    <select
                                        required
                                        value={newDealer.city}
                                        onChange={(e) => setNewDealer({...newDealer, city: e.target.value})}
                                        disabled={!newDealer.state}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
                                    >
                                        <option value="">Select City</option>
                                        {cities.map(city => (
                                            <option key={city} value={city}>{city}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person *</label>
                                    <input
                                        type="text"
                                        required
                                        value={newDealer.contactPerson}
                                        onChange={(e) => setNewDealer({...newDealer, contactPerson: e.target.value})}
                                        placeholder="Enter contact person name"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone *</label>
                                    <input
                                        type="tel"
                                        required
                                        value={newDealer.contactPhone}
                                        onChange={(e) => setNewDealer({...newDealer, contactPhone: e.target.value})}
                                        placeholder="Enter contact phone"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                                    <input
                                        type="email"
                                        required
                                        value={newDealer.email}
                                        onChange={(e) => setNewDealer({...newDealer, email: e.target.value})}
                                        placeholder="Enter email address"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                                    <select
                                        required
                                        value={newDealer.status}
                                        onChange={(e) => setNewDealer({...newDealer, status: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Distributor</label>
                                    <select
                                        value={newDealer.distributor}
                                        onChange={(e) => setNewDealer({...newDealer, distributor: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
                                    >
                                        <option value="">Select Distributor</option>
                                        {distributors.map(distributor => (
                                            <option key={distributor._id} value={distributor._id}>{distributor.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Username {!isEditing && '*'}</label>
                                    <input
                                        type="text"
                                        required={!isEditing}
                                        value={newDealer.username}
                                        onChange={(e) => setNewDealer({...newDealer, username: e.target.value})}
                                        placeholder={isEditing ? "Leave blank to keep current username" : "Enter username"}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Password {!isEditing && '*'}</label>
                                    <input
                                        type="password"
                                        required={!isEditing}
                                        value={newDealer.password}
                                        onChange={(e) => setNewDealer({...newDealer, password: e.target.value})}
                                        placeholder={isEditing ? "Leave blank to keep current password" : "Enter password"}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div className="mt-8">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full px-6 py-3 bg-[#8B8FFF] text-white rounded-xl hover:bg-[#7B7FFF] transition-colors font-medium flex items-center justify-center"
                                >
                                    {isSubmitting ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    ) : (
                                        isEditing ? 'Update Dealer' : 'Add Dealer'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showProductsModal && (
                <div className="fixed inset-0 bg-black/70 bg-opacity-20 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Products for {selectedDealer?.name}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowProductsModal(false);
                                    setSelectedDealer(null);
                                    setDealerProducts([]);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        
                        <div className="mt-4">
                            <DealerProductGroupList products={dealerProducts} />
                        </div>
                    </div>
                </div>
            )}

            {selectedWalletDealer && (
                <WalletDetailsModal
                    entityType={selectedWalletDealer.entityType}
                    entityId={selectedWalletDealer.entityId}
                    entityName={selectedWalletDealer.entityName}
                    onClose={() => setSelectedWalletDealer(null)}
                />
            )}
        </div>
    );
}

export default function DealersWithErrorBoundary() {
    return (
        <ErrorBoundary>
            <Dealers />
        </ErrorBoundary>
    );
}
