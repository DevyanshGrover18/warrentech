import { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { RefreshCw, Check, X, Clock, UserCheck, CheckCircle, Eye, Loader, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AssignTechnicianModal from './AssignTechnicianModal';
import RequestDetailsModal from './RequestDetailsModal';
import WarrantyDetailsModal from '../customer/WarrantyDetailsModal.jsx';
import { AuthContext } from '../../../context/AuthContext';

export default function Replacement() {
    const { user } = useContext(AuthContext);
    const [requests, setRequests] = useState([]);
    const [billingConfig, setBillingConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [activeTab, setActiveTab] = useState('pending');
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedRequestForDetails, setSelectedRequestForDetails] = useState(null);
    const [showWarrantyModal, setShowWarrantyModal] = useState(false);
    const [selectedWarranty, setSelectedWarranty] = useState(null);

    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const [requestsRes, billingRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/api/replacement-requests`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get(`${import.meta.env.VITE_API_URL}/api/billing-config`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);
            setRequests(requestsRes.data);
            setBillingConfig(billingRes.data);
        } catch (err) {
            toast.error('Error fetching data');
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRequests(); }, []);

    const handleStatusUpdate = async (id, status) => {
        if (status === 'Approved') {
            const request = requests.find(req => req._id === id);
            setSelectedRequest(request);
            setIsModalOpen(true);
        } else {
            try {
                const token = localStorage.getItem('token');
                await axios.put(`${import.meta.env.VITE_API_URL}/api/replacement-requests/${id}`, { status }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success(`Request ${status.toLowerCase()}`);
                fetchRequests();
            } catch {
                toast.error('Failed to update request status');
            }
        }
    };

    const handleOpenAssignModal = (request) => {
        setSelectedRequest(request);
        setIsModalOpen(true);
    };

    const handleAssignTechnician = async (id, technicianId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(
                `${import.meta.env.VITE_API_URL}/api/replacement-requests/${id}`,
                { assignedTechnician: technicianId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success('Technician assigned successfully');
            fetchRequests();
            setIsModalOpen(false);
            setSelectedRequest(null);
        } catch {
            toast.error('Failed to assign technician');
        }
    };

    const handleViewDetails = (request) => {
        setSelectedRequestForDetails(request);
        setIsDetailsModalOpen(true);
    };

    const handleViewBilling = (warranty) => {
        setSelectedWarranty(warranty);
        setShowWarrantyModal(true);
    };

    const filteredRequests = requests.filter(req => {
        if (activeTab === 'pending') return req.status === 'Pending';
        if (activeTab === 'assigned') return req.status === 'Assigned';
        if (activeTab === 'inProgress') return req.status === 'In Progress';
        if (activeTab === 'replacementRequired') return req.status === 'Replacement Required';
        if (activeTab === 'completed') return req.status === 'Completed' || req.status === 'Rejected';
        return true;
    });

    const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
    const paginatedRequests = filteredRequests.slice(
        (currentPage - 1) * itemsPerPage, currentPage * itemsPerPage
    );

    const TabButton = ({ id, label, icon: Icon, isActive, onClick, count }) => (
        <motion.button
            onClick={() => onClick(id)}
            className={`flex items-center px-4 py-2 font-medium text-sm rounded-md transition-all duration-300 ease-in-out
                ${isActive ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            <Icon className="w-4 h-4 mr-2" />
            {label}
            {count > 0 && (
                <span className={`ml-2 text-xs font-semibold px-2 py-1 rounded-full ${isActive ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-700'}`}>
                    {count}
                </span>
            )}
        </motion.button>
    );

    const statusCounts = {
        pending: requests.filter(r => r.status === 'Pending').length,
        assigned: requests.filter(r => r.status === 'Assigned').length,
        inProgress: requests.filter(r => r.status === 'In Progress').length,
        replacementRequired: requests.filter(r => r.status === 'Replacement Required').length,
        completed: requests.filter(r => r.status === 'Completed' || r.status === 'Rejected').length
    };

    return (
        <div className="p-4">
            <div className="p-4 bg-white mt-2 rounded-lg">
                <h1 className="text-xl font-semibold text-gray-800 mb-4">Replacement Requests</h1>

                {/* Tabs */}
                <motion.div layout className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
                    <TabButton id="pending" label="Pending" icon={Clock} isActive={activeTab === 'pending'} onClick={setActiveTab} count={statusCounts.pending} />
                    <TabButton id="assigned" label="Assigned" icon={UserCheck} isActive={activeTab === 'assigned'} onClick={setActiveTab} count={statusCounts.assigned} />
                    <TabButton id="inProgress" label="In Progress" icon={Loader} isActive={activeTab === 'inProgress'} onClick={setActiveTab} count={statusCounts.inProgress} />
                    <TabButton id="replacementRequired" label="Replacement Required" icon={AlertTriangle} isActive={activeTab === 'replacementRequired'} onClick={setActiveTab} count={statusCounts.replacementRequired} />
                    <TabButton id="completed" label="Completed" icon={CheckCircle} isActive={activeTab === 'completed'} onClick={setActiveTab} count={statusCounts.completed} />
                </motion.div>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-6 text-gray-500">Loading requests...</p>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab} // Unique key for each tab content to enable exit animations
                            initial={{ x: 10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -10, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="w-full" // Ensure the motion.div takes full width
                        >
                        {filteredRequests.length === 0 ? (
                            <div className="text-center py-20">
                                <RefreshCw className="mx-auto h-16 w-16 text-gray-400" />
                                <h3 className="mt-4 text-lg font-medium text-gray-900">No {activeTab} replacement requests</h3>
                                <p className="mt-1 text-sm text-gray-500">New replacement requests will appear here.</p>
                            </div>
                        ) : (
                            <>
                                {/* TABLE */}
                                <div className="overflow-x-auto">
                                    <div className="min-w-[1500px]"> {/* Prevents table compression */}
                                        <table className="min-w-full divide-y divide-gray-200 rounded-lg table-auto">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    {[
                                                        "Model", "Serial Number", "Customer",
                                                        "Warranty Status", "Assigned Technician", "Actions"
                                                    ].map((header, idx) => (
                                                        <th
                                                            key={idx}
                                                            className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase"
                                                        >
                                                            {header}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>

                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {paginatedRequests.map((request) => (
                                                    <tr
                                                        key={request._id}
                                                        className="hover:bg-gray-50 transition"
                                                    >
                                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 line-clamp-1">
                                                            {request.product?.model?.name || 'N/A'}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600">
                                                            {request.product?.serialNumber || 'N/A'}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600">
                                                            <div>{request.customer?.name || 'N/A'}</div>
                                                            <div className="text-xs text-gray-500">{request.customer?.phone || 'N/A'}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm">
                                                            {request.warrantyInfo ? (
                                                                <span className={`font-semibold ${request.warrantyInfo.inWarranty ? 'text-green-600' : 'text-red-600'}`}>
                                                                    {request.warrantyInfo.inWarranty ? 'Active' : 'Expired'}
                                                                </span>
                                                            ) : 'N/A'}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600">
                                                            {request.technician?.name || 'N/A'}
                                                        </td>

                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center space-x-3">
                                                                <button onClick={() => handleViewDetails(request)} className="text-gray-500 hover:text-indigo-600">
                                                                    <Eye className="h-5 w-5" />
                                                                </button>
                                                                {user?.role === 'executive' ? (
                                                                    <button
                                                                        onClick={() => handleOpenAssignModal(request)}
                                                                        className="text-blue-600 hover:text-blue-800"
                                                                        disabled={request.status === 'Completed' || request.status === 'Rejected'}
                                                                    >
                                                                        <UserCheck className="h-5 w-5" />
                                                                    </button>
                                                                ) : request.status === 'Pending' ? (
                                                                    <>
                                                                        <button
                                                                            onClick={() => handleStatusUpdate(request._id, 'Approved')}
                                                                            className="text-green-600 hover:text-green-800"
                                                                        >
                                                                            <Check className="h-5 w-5" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleStatusUpdate(request._id, 'Rejected')}
                                                                            className="text-red-600 hover:text-red-800"
                                                                        >
                                                                            <X className="h-5 w-5" />
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Check className="h-5 w-5 text-gray-300" />
                                                                        <X className="h-5 w-5 text-gray-300" />
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* PAGINATION */}
                                <div className="px-6 py-3 bg-white border-t border-gray-200 flex flex-col md:flex-row items-center md:justify-between gap-3 rounded">
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
                                            {[10, 25, 50, 75, 100].map(n => (
                                                <option value={n} key={n}>{n}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="hidden md:block text-sm text-gray-700">
                                        Showing {paginatedRequests.length ? (currentPage - 1) * itemsPerPage + 1 : 0} to{' '}
                                        {Math.min(currentPage * itemsPerPage, filteredRequests.length)} of {filteredRequests.length} requests
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
                                        >
                                            Previous
                                        </button>

                                        <span className="text-sm text-gray-700">
                                            Page {currentPage} of {totalPages}
                                        </span>

                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage === totalPages}
                                            className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                        </motion.div>
                    </AnimatePresence>
                )}

                <AssignTechnicianModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedRequest(null);
                    }}
                    request={selectedRequest}
                    onAssign={handleAssignTechnician}
                />

                <RequestDetailsModal
                    isOpen={isDetailsModalOpen}
                    onClose={() => setIsDetailsModalOpen(false)}
                    request={selectedRequestForDetails}
                    billingConfig={billingConfig}
                />
            </div>
        </div>
    );
}
