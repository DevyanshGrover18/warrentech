import React, { useEffect, useState, useContext } from 'react';
import { Plus, X, FilePenLine, Trash2, Box } from 'lucide-react';
import ListComponent from '../../global/ListComponent';
import ErrorBoundary from '../../global/ErrorBoundary';
import { AuthContext } from '../../../context/AuthContext';
import { toast } from 'react-hot-toast';
import axios from 'axios';

import ExportToExcelButton from '../../global/ExportToExcelButton';
import ExportToPdfButton from '../../global/ExportToPdfButton';
import { confirmDelete } from '../../global/deleteConfirm';
import WalletDetailsModal from '../Wallets/components/WalletDetailsModal';
import WalletIconButton from '../Wallets/components/WalletIconButton';
import PaginationBar from '../../global/PaginationBar';

const API_URL = `${import.meta.env.VITE_API_URL}/api/sub-dealers`;

function SubDealers() {
    const { user, isAdmin } = useContext(AuthContext);
    const [subDealers, setSubDealers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const [showModal, setShowModal] = useState(false);
    const [selectedSubDealer, setSelectedSubDealer] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedWalletEntity, setSelectedWalletEntity] = useState(null);
    
    const [newSubDealer, setNewSubDealer] = useState({
        name: '',
        address: '',
        state: '',
        city: '',
        contactPerson: '',
        contactPhone: '',
        email: '',
        status: 'Active',
        username: '',
        password: '',
        dealer: ''
    });

    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);
    const [dealers, setDealers] = useState([]);
    const [dealerFilter, setDealerFilter] = useState('all');

    const fetchSubDealers = async () => {
        try {
            setLoading(true);
            const response = await axios.get(API_URL, {
                params: {
                    search: searchTerm,
                    page,
                    limit,
                    dealerId: isAdmin ? (dealerFilter === 'all' ? undefined : dealerFilter) : user.dealer?._id
                }
            });
            setSubDealers(response.data.items || response.data);
            if (response.data.pagination) {
                setTotalItems(response.data.pagination.totalItems);
                setTotalPages(response.data.pagination.totalPages);
            }
        } catch (error) {
            toast.error('Error fetching sub dealers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubDealers();
    }, [user, searchTerm, page, limit, dealerFilter]);

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

        if (isAdmin) {
            const fetchDealers = async () => {
                try {
                    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/dealers`);
                    setDealers(response.data);
                } catch (error) {
                    console.error('Error fetching dealers:', error);
                }
            };
            fetchDealers();
        }
    }, [isAdmin]);

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
        if (newSubDealer.state) {
            fetchCities(newSubDealer.state);
        }
    }, [newSubDealer.state]);

    const handleAddEditSubDealer = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const data = { ...newSubDealer };
            if (!isAdmin) {
                data.dealer = user.dealer?._id;
            }
            
            if (isEditing) {
                await axios.put(`${API_URL}/${selectedSubDealer._id}`, data);
                toast.success('Sub Dealer updated successfully');
            } else {
                await axios.post(API_URL, data);
                toast.success('Sub Dealer added successfully');
            }
            handleModalClose();
            fetchSubDealers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving sub dealer');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditClick = (sd) => {
        setSelectedSubDealer(sd);
        setNewSubDealer({
            name: sd.name,
            address: sd.address,
            state: sd.state,
            city: sd.city,
            contactPerson: sd.contactPerson,
            contactPhone: sd.contactPhone,
            email: sd.email,
            status: sd.status,
            username: sd.username || '',
            password: '',
            dealer: sd.dealer?._id || sd.dealer || ''
        });
        setIsEditing(true);
        setShowModal(true);
    };

    const handleDelete = async (id, name) => {
        const confirmed = await confirmDelete({
            entityLabel: 'sub dealer',
            entityName: name
        });

        if (!confirmed) return;

        try {
            await axios.delete(`${API_URL}/${id}`);
            toast.success('Sub Dealer deleted successfully');
            fetchSubDealers();
        } catch (error) {
            toast.error('Error deleting sub dealer');
        }
    };

    const handleModalClose = () => {
        setShowModal(false);
        setSelectedSubDealer(null);
        setIsEditing(false);
        setNewSubDealer({
            name: '',
            address: '',
            state: '',
            city: '',
            contactPerson: '',
            contactPhone: '',
            email: '',
            status: 'Active',
            username: '',
            password: '',
            dealer: ''
        });
    };

    const openWalletModal = (sd) => {
        setSelectedWalletEntity({
            entityType: 'sub_dealer',
            entityId: sd._id,
            entityName: sd.name,
        });
    };

    const columns = [
        { header: 'ID', accessor: 'subDealerId' },
        { header: 'Name', accessor: 'name' },
        { header: 'City', accessor: 'city' },
        { header: 'Dealer', accessor: 'dealer' },
        { header: 'Products', accessor: 'productCount' },
    ];

    const getExportData = () => {
        return subDealers.map(sd => ({
            'ID': sd.subDealerId,
            'Name': sd.name,
            'City': sd.city,
            'Dealer': sd.dealer?.name || 'N/A',
            'Products Count': sd.productCount || 0,
        }));
    };

    return (
        <div className="p-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 sm:p-6 border-b border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Sub Dealer List</h2>
                            <p className="text-sm text-gray-600">Total {totalItems}</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <ExportToExcelButton getData={getExportData} filename="sub-dealers-export" />
                            <ExportToPdfButton getData={getExportData} columns={columns} filename="sub-dealers-export" />
                            <button
                                onClick={() => setShowModal(true)}
                                className="flex items-center justify-center space-x-2 bg-[#4d55f5] text-white px-4 py-2 rounded-lg hover:bg-[#3d45e5] transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Add Sub Dealer</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:p-6 border-b border-gray-200">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Search sub dealers..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
                            />
                        </div>
                        {isAdmin && (
                            <div className="w-full md:w-64">
                                <select
                                    value={dealerFilter}
                                    onChange={(e) => setDealerFilter(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
                                >
                                    <option value="all">All Dealers</option>
                                    {dealers.map(d => (
                                        <option key={d._id} value={d._id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4d55f5] mx-auto"></div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dealer</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {subDealers.map((sd) => (
                                        <tr key={sd._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sd.subDealerId}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sd.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sd.city}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sd.dealer?.name || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {sd.productCount || 0} Products
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <div className="flex items-center space-x-2">
                                                    <WalletIconButton onClick={() => openWalletModal(sd)} />
                                                    <button onClick={() => handleEditClick(sd)} className="p-2 hover:bg-gray-100 rounded-full">
                                                        <FilePenLine size={20} className="text-gray-500" />
                                                    </button>
                                                    <button onClick={() => handleDelete(sd._id, sd.name)} className="p-2 hover:bg-gray-100 rounded-full">
                                                        <Trash2 size={20} className="text-red-500" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {totalItems > 0 && (
                    <PaginationBar
                        page={page}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        limit={limit}
                        itemLabel="sub dealers"
                        onPageChange={setPage}
                        onLimitChange={setLimit}
                    />
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[95vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">{isEditing ? 'Edit Sub Dealer' : 'Add New Sub Dealer'}</h3>
                            <button onClick={handleModalClose}><X className="h-6 w-6" /></button>
                        </div>
                        <form onSubmit={handleAddEditSubDealer}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                    <input required value={newSubDealer.name} onChange={e => setNewSubDealer({...newSubDealer, name: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                                    <input required value={newSubDealer.address} onChange={e => setNewSubDealer({...newSubDealer, address: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                                    <select required value={newSubDealer.state} onChange={e => setNewSubDealer({...newSubDealer, state: e.target.value, city: ''})} className="w-full px-4 py-2 border rounded-lg">
                                        <option value="">Select State</option>
                                        {states.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                                    <select required value={newSubDealer.city} onChange={e => setNewSubDealer({...newSubDealer, city: e.target.value})} disabled={!newSubDealer.state} className="w-full px-4 py-2 border rounded-lg">
                                        <option value="">Select City</option>
                                        {cities.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person *</label>
                                    <input required value={newSubDealer.contactPerson} onChange={e => setNewSubDealer({...newSubDealer, contactPerson: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone *</label>
                                    <input required value={newSubDealer.contactPhone} onChange={e => setNewSubDealer({...newSubDealer, contactPhone: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                    <input required type="email" value={newSubDealer.email} onChange={e => setNewSubDealer({...newSubDealer, email: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                                    <select required value={newSubDealer.status} onChange={e => setNewSubDealer({...newSubDealer, status: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>
                                {isAdmin && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Dealer *</label>
                                        <select required value={newSubDealer.dealer} onChange={e => setNewSubDealer({...newSubDealer, dealer: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
                                            <option value="">Select Dealer</option>
                                            {dealers.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                                    <input required={!isEditing} value={newSubDealer.username} onChange={e => setNewSubDealer({...newSubDealer, username: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                                    <input required={!isEditing} type="password" value={newSubDealer.password} onChange={e => setNewSubDealer({...newSubDealer, password: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                                </div>
                            </div>
                            <button type="submit" disabled={isSubmitting} className="mt-6 w-full bg-[#4d55f5] text-white py-2 rounded-lg hover:bg-[#3d45e5]">
                                {isSubmitting ? 'Saving...' : (isEditing ? 'Update Sub Dealer' : 'Add Sub Dealer')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {selectedWalletEntity && (
                <WalletDetailsModal
                    entityType={selectedWalletEntity.entityType}
                    entityId={selectedWalletEntity.entityId}
                    entityName={selectedWalletEntity.entityName}
                    onClose={() => setSelectedWalletEntity(null)}
                />
            )}
        </div>
    );
}

export default function SubDealersWithErrorBoundary() {
    return (
        <ErrorBoundary>
            <SubDealers />
        </ErrorBoundary>
    );
}
