import { useEffect, useState, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { AuthContext } from '../../../context/AuthContext';
import { Eye, Wrench } from 'lucide-react';
import TechnicianRequestDetailsModal from './TechnicianRequestDetailsModal';
import DiagnoseModal from './DiagnoseModal';

export default function TechnicianRequests() {
    const [requests, setRequests] = useState([]);
    const [filteredRequests, setFilteredRequests] = useState([]);
    const [billingConfig, setBillingConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const { user } = useContext(AuthContext);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedRequestForDetail, setSelectedRequestForDetail] = useState(null);
    const [isDiagnoseModalOpen, setIsDiagnoseModalOpen] = useState(false);
    const [selectedRequestForDiagnosis, setSelectedRequestForDiagnosis] = useState(null);
    
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const statusFilter = queryParams.get('status');

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const [requestsRes, billingRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/api/technicians/requests`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get(`${import.meta.env.VITE_API_URL}/api/billing-config`, {
                    headers: { Authorization: `Bearer ${token}` },
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

    useEffect(() => {
        if (user && user.role === 'technician') {
            fetchRequests();
        }
    }, [user]);

    useEffect(() => {
        if (statusFilter) {
            setFilteredRequests(requests.filter(req => req.status === statusFilter));
        } else {
            setFilteredRequests(requests);
        }
    }, [requests, statusFilter]);

    const handleStatusChange = async (requestId, newStatus) => {
        const originalRequests = [...requests];
        
        setRequests(prevRequests =>
            prevRequests.map(req =>
                req._id === requestId ? { ...req, status: newStatus } : req
            )
        );

        try {
            const token = localStorage.getItem('token');
            await axios.put(
                `${import.meta.env.VITE_API_URL}/api/replacement-requests/${requestId}`,
                { status: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success('Status updated successfully');
        } catch (err) {
            setRequests(originalRequests);
            toast.error(err.response?.data?.message || 'Failed to update status');
            console.error('Error updating status:', err);
        }
    };

    const handleViewDetails = (request) => {
        setSelectedRequestForDetail(request);
        setIsDetailModalOpen(true);
    };

    const handleDiagnoseClick = (request) => {
        setSelectedRequestForDiagnosis(request);
        setIsDiagnoseModalOpen(true);
    };

    const handleDiagnoseSubmit = async (requestId, formData) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `${import.meta.env.VITE_API_URL}/api/replacement-requests/${requestId}/diagnose`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` } }
            );
            toast.success('Diagnosis submitted successfully');
            setIsDiagnoseModalOpen(false);
            fetchRequests(); // Refresh data to show status changes
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit diagnosis');
            console.error('Error submitting diagnosis:', err);
        }
    };

    const getStatusDotClass = (status) => {
        switch (status) {
            case 'Assigned':
                return 'bg-blue-500';
            case 'In Progress':
                return 'bg-yellow-500';
            case 'Completed':
                return 'bg-green-500';
            case 'Rejected':
                return 'bg-red-500';
            default:              
                return 'bg-gray-500';
        }
    };

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-semibold text-gray-800">
                    {statusFilter ? `${statusFilter} Service Requests` : 'Assigned Service Requests'}
                </h1>
                {statusFilter && (
                    <button 
                        onClick={() => window.history.back()} 
                        className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                        Back to All
                    </button>
                )}
            </div>
            {loading ? (
                <div className="text-center py-20">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-6 text-gray-500">Loading requests...</p>
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="text-center py-20">
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No requests found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        {statusFilter ? `You have no requests with status "${statusFilter}".` : 'You have no assigned requests at the moment.'}
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto bg-white rounded-lg shadow">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Number</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Details</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product & Issue</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Address</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Type</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visit Date</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredRequests.map((request) => (
                                <tr key={request._id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{request.jcNumber || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="font-medium text-gray-900">{request.customer?.name || 'N/A'}</div>
                                        <div>{request.customer?.phone || 'N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 max-w-xs">
                                        <div className="font-medium text-gray-900">{request.product?.model?.name || 'N/A'}</div>
                                        <div className="text-xs text-gray-600 mt-1 truncate" title={request.complaintDescription || request.reason}>
                                            {request.complaintDescription || request.reason || 'No issue description.'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 max-w-xs">{request.customer?.address || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {request.warrantyInfo ? (
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${request.warrantyInfo.inWarranty ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {request.warrantyInfo.inWarranty ? 'In Warranty' : 'Out of Warranty'}
                                            </span>
                                        ) : (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                Unknown
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {request.preferredVisitDate ? new Date(request.preferredVisitDate).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex items-center">
                                            <span className={`h-2.5 w-2.5 rounded-full mr-2 ${getStatusDotClass(request.status)}`}></span>
                                            <select
                                                value={request.status}
                                                onChange={(e) => handleStatusChange(request._id, e.target.value)}
                                                className="w-full p-1.5 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 bg-transparent"
                                                disabled={request.status === 'Completed' || request.status === 'Replacement Required'}
                                            >
                                                <option value="Assigned">Assigned</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="Completed">Completed</option>
                                            </select>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => handleViewDetails(request)} className="text-gray-500 hover:text-indigo-600 p-1">
                                                <Eye className="h-5 w-5" />
                                            </button>
                                            {request.status === 'In Progress' && (
                                                <button onClick={() => handleDiagnoseClick(request)} className="text-gray-500 hover:text-blue-600 p-1">
                                                    <Wrench className="h-5 w-5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {isDetailModalOpen && selectedRequestForDetail && (
                <TechnicianRequestDetailsModal
                    isOpen={isDetailModalOpen}
                    request={selectedRequestForDetail}
                    billingConfig={billingConfig}
                    onClose={() => setIsDetailModalOpen(false)}
                />
            )}
            {isDiagnoseModalOpen && selectedRequestForDiagnosis && (
                <DiagnoseModal
                    isOpen={isDiagnoseModalOpen}
                    request={selectedRequestForDiagnosis}
                    billingConfig={billingConfig}
                    onClose={() => setIsDiagnoseModalOpen(false)}
                    onSubmit={handleDiagnoseSubmit}
                />
            )}
        </div>
    );
}
