import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { confirmDelete } from '../../global/deleteConfirm';
import { Users, Plus, Edit, Trash2, Box } from 'lucide-react';
import AssignedRequestsModal from './AssignedRequestsModal';
import { TechnicianFilters } from './components/TechnicianFilters';
import ExportToExcelButton from '../../global/ExportToExcelButton';
import ExportToPdfButton from '../../global/ExportToPdfButton';

export default function Technicians() {
    const [technicians, setTechnicians] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showRequestsModal, setShowRequestsModal] = useState(false);
    const [selectedTechnician, setSelectedTechnician] = useState(null);
    const [selectedRequests, setSelectedRequests] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        state: '',
        city: '',
        username: '',
        password: '',
        technicianCode: '',
    });
    const [allStates, setAllStates] = useState([]);
    const [allCities, setAllCities] = useState([]);
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [codeError, setCodeError] = useState('');
    const [isCheckingCode, setIsCheckingCode] = useState(false);
    const [selectedTechnicians, setSelectedTechnicians] = useState([]);
    const [stateFilter, setStateFilter] = useState('all');
    const [cityFilter, setCityFilter] = useState('all');
    const [distributorFilter, setDistributorFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

        useEffect(() => {
            const checkCode = async () => {
                if (!formData.technicianCode) {
                    setCodeError('');
                    return;
                }
                setIsCheckingCode(true);
                try {
                    const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/technicians/check-code/${formData.technicianCode}`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                    });
                    if (res.data.isTaken) {
                        setCodeError('This code is already taken.');
                    } else {
                        setCodeError('');
                    }

                } catch (error) {
                    setCodeError('Error checking code.');
                } finally {
                    setIsCheckingCode(false);
                }
            };

            const debounceTimeout = setTimeout(() => {
                checkCode();
            }, 300);
            return () => clearTimeout(debounceTimeout);
        }, [formData.technicianCode]);

        const uniqueStates = useMemo(() => [...new Set(technicians.map(t => t.state).filter(Boolean))], [technicians]);
        const uniqueCities = useMemo(() => [...new Set(technicians.filter(t => t.state === stateFilter).map(t => t.city).filter(Boolean))], [stateFilter, technicians]);

        useEffect(() => {
            setStates(uniqueStates);
        }, [uniqueStates]);
    
        useEffect(() => {
            setCities(uniqueCities);
        }, [uniqueCities]);

        // Fetch all states for dropdown
        const fetchAllStates = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/locations/states`);
                setAllStates(res.data);
            } catch (error) {
                console.error('Error fetching states:', error);
            }
        };

        // Fetch cities for selected state
        const fetchCitiesForState = async (state) => {
            if (!state) {
                setAllCities([]);
                return;
            }
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/locations/cities/${encodeURIComponent(state)}`);
                setAllCities(res.data);
            } catch (error) {
                console.error('Error fetching cities:', error);
                setAllCities([]);
            }
        };

        useEffect(() => {
            fetchAllStates();
        }, []);

        useEffect(() => {
            fetchCitiesForState(formData.state);
        }, [formData.state]);
    
        const [itemsPerPage, setItemsPerPage] = useState(10);
        const [currentPage, setCurrentPage] = useState(1);

    const fetchTechnicians = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/technicians`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setTechnicians(res.data);
        } catch (err) {
            toast.error('Error fetching technicians');
            console.error('Error fetching technicians:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTechnicians();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'state') {
            setFormData({ ...formData, state: value, city: '' });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleAddTechnician = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${import.meta.env.VITE_API_URL}/api/technicians`, formData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success('Technician added successfully');
            setShowAddModal(false);
            resetForm();
            fetchTechnicians();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add technician');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            phone: '',
            address: '',
            state: '',
            city: '',
            username: '',
            password: '',
            technicianCode: '',
        });
        setAllCities([]);
        setCodeError('');
    };

    const handleEditTechnician = (technician) => {
        setSelectedTechnician(technician);
        setFormData({
            name: technician.name,
            phone: technician.phone,
            address: technician.address,
            state: technician.state,
            city: technician.city,
            username: technician.user.username,
            password: '',
        });
        // Load cities for the selected state
        if (technician.state) {
            fetchCitiesForState(technician.state);
        }
        setShowEditModal(true);
    };

    const handleUpdateTechnician = async (e) => {
        e.preventDefault();
        if (!selectedTechnician) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${import.meta.env.VITE_API_URL}/api/technicians/${selectedTechnician._id}`, formData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success('Technician updated successfully');
            setShowEditModal(false);
            resetForm();
            fetchTechnicians();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update technician');
        }
    };

    const handleDeleteTechnician = async (id) => {
        const technician = technicians.find(item => item._id === id);
        const confirmed = await confirmDelete({
            entityLabel: 'technician',
            itemName: technician?.name,
        });

        if (!confirmed) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/technicians/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success('Technician deleted successfully');
            fetchTechnicians();
        } catch (error) {
            toast.error('Failed to delete technician');
        }
    };

    const handleShowRequests = (requests) => {
        setSelectedRequests(requests);
        setShowRequestsModal(true);
    };

    const handleSelectTechnician = (id) => {
        setSelectedTechnicians(prev =>
            prev.includes(id) ? prev.filter(techId => techId !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedTechnicians.length === paginatedTechnicians.length) {
            setSelectedTechnicians([]);
        } else {
            setSelectedTechnicians(paginatedTechnicians.map(tech => tech._id));
        }
    };

    const handleDeleteSelected = async () => {
        const confirmed = await confirmDelete({
            entityLabel: 'technician',
            entityLabelPlural: 'technicians',
            count: selectedTechnicians.length,
        });

        if (!confirmed) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/technicians`, {
                headers: { Authorization: `Bearer ${token}` },
                data: { ids: selectedTechnicians },
            });
            toast.success('Selected technicians deleted successfully');
            fetchTechnicians();
            setSelectedTechnicians([]);
        } catch (error) {
            toast.error('Failed to delete selected technicians');
        }
    };

    const filteredTechnicians = useMemo(() => {
        return technicians.filter(technician => {
            const { name, technicianCode, phone, state, city, user } = technician;
            const { username } = user;
            const query = searchQuery.toLowerCase();

            const matchSearch = (
                name.toLowerCase().includes(query) ||
                technicianCode.toLowerCase().includes(query) ||
                phone.toLowerCase().includes(query) ||
                username.toLowerCase().includes(query)
            );

            const matchState = stateFilter === 'all' || state === stateFilter;
            const matchCity = cityFilter === 'all' || city === cityFilter;

            return matchSearch && matchState && matchCity;
        });
    }, [technicians, searchQuery, stateFilter, cityFilter]);

    // Derived pagination values
    const totalPages = Math.ceil(filteredTechnicians.length / itemsPerPage);
    const paginatedTechnicians = filteredTechnicians.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Export columns definition
    const techniciansColumns = [
        { header: 'Name', accessor: 'Name' },
        { header: 'Technician Code', accessor: 'Technician Code' },
        { header: 'Phone', accessor: 'Phone' },
        { header: 'Address', accessor: 'Address' },
        { header: 'State', accessor: 'State' },
        { header: 'City', accessor: 'City' },
        { header: 'Username', accessor: 'Username' },
        { header: 'Assigned Requests', accessor: 'Assigned Requests' },
    ];

    // Export data function
    const getExportData = () => {
        return filteredTechnicians.map(technician => ({
            'Name': technician.name || '-',
            'Technician Code': technician.technicianCode || '-',
            'Phone': technician.phone || '-',
            'Address': technician.address || '-',
            'State': technician.state || '-',
            'City': technician.city || '-',
            'Username': technician.user?.username || '-',
            'Assigned Requests': technician.assignedRequests?.length || 0,
        }));
    };

    return (
    <div className='p-4'>
        <div className="p-6 bg-white mt-2 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-800">Technicians</h1>
                    <p className="text-sm text-gray-500">Total {filteredTechnicians.length}</p>
                </div>
                <div className="flex items-center space-x-2">
                    <ExportToExcelButton getData={getExportData} filename="technicians-export" />
                    <ExportToPdfButton getData={getExportData} columns={techniciansColumns} filename="technicians-export" />
                    <button
                        onClick={() => {
                            resetForm();
                            setShowAddModal(true);
                        }}
                        className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Technician
                    </button>
                </div>
            </div>

            <TechnicianFilters
                searchTerm={searchQuery}
                onSearchChange={setSearchQuery}
                stateFilter={stateFilter}
                onStateFilterChange={setStateFilter}
                cityFilter={cityFilter}
                onCityFilterChange={setCityFilter}
                states={states}
                cities={cities}
                onClearFilters={() => {
                    setSearchQuery('');
                    setStateFilter('all');
                    setCityFilter('all');
                }}
            />
            <div className="flex justify-end items-center mb-4">
                {selectedTechnicians.length > 0 && (
                    <button
                        onClick={handleDeleteSelected}
                        className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete ({selectedTechnicians.length})
                    </button>
                )}
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-6 text-gray-500">Loading technicians...</p>
                </div>
            ) : filteredTechnicians.length === 0 ? (
                <div className="text-center py-20">
                    <Users className="mx-auto h-16 w-16 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No technicians found</h3>
                    <p className="mt-1 text-sm text-gray-500">Add a technician to get started.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={selectedTechnicians.length === paginatedTechnicians.length && paginatedTechnicians.length > 0}
                                    />
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technician Code</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Requests</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedTechnicians.map((technician) => (
                                <tr key={technician._id} className={selectedTechnicians.includes(technician._id) ? 'bg-gray-100' : ''}>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            checked={selectedTechnicians.includes(technician._id)}
                                            onChange={() => handleSelectTechnician(technician._id)}
                                        />
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{technician.name}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{technician.technicianCode}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{technician.phone}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{technician.state}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{technician.city}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{technician.user.username}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <button
                                            onClick={() => handleShowRequests(technician.assignedRequests)}
                                            className="text-indigo-600 hover:text-indigo-900 disabled:text-gray-400 flex items-center border p-1 rounded hover:bg-gray-200"
                                            disabled={technician.assignedRequests.length === 0}
                                        >
                                            <Box className="h-4 w-4 mr-2"/>
                                            {technician.assignedRequests.length} Requests
                                        </button>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => handleEditTechnician(technician)} className="text-indigo-600 hover:text-indigo-900"><Edit className="h-5 w-5" /></button>
                                            <button onClick={() => handleDeleteTechnician(technician._id)} className="text-red-600 hover:text-red-900"><Trash2 className="h-5 w-5" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="px-6 py-3 bg-white border-t border-gray-200 flex flex-col md:flex-row items-center md:justify-between gap-3 md:gap-0 rounded">
                        <div className="flex items-center space-x-2">
                            <span>Rows per page:</span>
                            <select
                                className="border border-gray-300 rounded px-2 py-1"
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

                        <div className="text-sm text-gray-700 hidden md:block">
                            Showing {paginatedTechnicians.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredTechnicians.length)} of {filteredTechnicians.length} technicians
                        </div>

                        <div className="flex items-center space-x-2">
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

            {showAddModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-3xl">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Technician</h3>
                        <form onSubmit={handleAddTechnician}>
                            <div className="space-y-4 grid grid-cols-2 gap-4">
                                <input type="text" name="name" placeholder="Name" onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg" required />
                                <div>
                                    <input type="text" name="technicianCode" placeholder="Technician Code" onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg" required />
                                    {isCheckingCode && <p className="text-xs text-gray-500 mt-1">Checking...</p>}
                                    {codeError && <p className="text-xs text-red-500 mt-1">{codeError}</p>}
                                </div>
                                <input type="text" name="phone" placeholder="Phone" onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg" required />
                                <input type="text" name="address" placeholder="Address" onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg" required />
                                <select name="state" value={formData.state} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg" required>
                                    <option value="">Select State</option>
                                    {allStates.map(state => <option key={state} value={state}>{state}</option>)}
                                </select>
                                <select name="city" value={formData.city} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg" required>
                                    <option value="">Select City</option>
                                    {allCities.map(city => <option key={city} value={city}>{city}</option>)}
                                </select>
                                <input type="text" name="username" placeholder="Username" onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg" required />
                                <div>
                                    <input type="password" name="password" placeholder="Password" onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg" required />
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end space-x-2">
                                <button type="button" onClick={() => {
                                    setShowAddModal(false);
                                    resetForm();
                                }} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400" disabled={!!codeError || isCheckingCode}>Add</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showEditModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Technician</h3>
                        <form onSubmit={handleUpdateTechnician}>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Technician Code</label>
                                    <input type="text" value={selectedTechnician?.technicianCode || ''} className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100" disabled />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Name</label>
                                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                                    <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Address</label>
                                    <input type="text" name="address" value={formData.address} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">State</label>
                                    <select name="state" value={formData.state} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg" required>
                                        <option value="">Select State</option>
                                        {allStates.map(state => <option key={state} value={state}>{state}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">City</label>
                                    <select name="city" value={formData.city} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg" required>
                                        <option value="">Select City</option>
                                        {allCities.map(city => <option key={city} value={city}>{city}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Username</label>
                                    <input type="text" name="username" value={formData.username} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">New Password</label>
                                    <input type="password" name="password" placeholder="New Password" onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg" />
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end space-x-2">
                                <button type="button" onClick={() => {
                                    setShowEditModal(false);
                                    resetForm();
                                }} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Update</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <AssignedRequestsModal
                isOpen={showRequestsModal}
                onClose={() => setShowRequestsModal(false)}
                requests={selectedRequests}
            />
        </div>
    </div>
    );
}
