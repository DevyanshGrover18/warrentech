import { useContext, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { incentiveService } from '../../../services/incentiveService';
import { AuthContext } from '../../../context/AuthContext';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const statusOptions = ['all', 'incomplete', 'pending_approval', 'approved', 'rejected'];
const actionableStatuses = ['incomplete', 'pending_approval'];

export default function AllIncentives() {
  const { isAdmin } = useContext(AuthContext);
  const [status, setStatus] = useState('all');
  const [incentives, setIncentives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingSaleId, setActingSaleId] = useState(null);
  const [rejectionNotes, setRejectionNotes] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await incentiveService.getIncentives(status, itemsPerPage, currentPage);
      // Backend now returns { data, total, page, totalPages } when limit is provided
      setIncentives(response.data || []);
      setTotalPages(response.totalPages || 1);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load incentives');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [status, currentPage]);

  const handleApprove = async (saleId) => {
    try {
      setActingSaleId(saleId);
      await incentiveService.approve(saleId);
      toast.success('Incentive approved');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve incentive');
    } finally {
      setActingSaleId(null);
    }
  };

  const handleReject = async (saleId) => {
    const note = (rejectionNotes[saleId] || '').trim();
    if (!note) {
      toast.error('A rejection reason is required.');
      return;
    }

    try {
      setActingSaleId(saleId);
      await incentiveService.reject(saleId, note);
      toast.success('Incentive rejected');
      setRejectionNotes((prev) => ({ ...prev, [saleId]: '' }));
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject incentive');
    } finally {
      setActingSaleId(null);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <nav className="flex mb-2" aria-label="Breadcrumb">
              <ol className="inline-flex items-center space-x-1 md:space-x-3">
                <li className="inline-flex items-center">
                  <Link to="/incentives" className="text-sm text-gray-500 hover:text-blue-600">Incentives</Link>
                </li>
                <li>
                  <div className="flex items-center">
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <span className="ml-1 text-sm font-medium text-gray-700 md:ml-2">All Records</span>
                  </div>
                </li>
              </ol>
            </nav>
            <h1 className="text-2xl font-bold text-gray-900">All Incentives</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">Status</span>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading incentives...</div>
        ) : incentives.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No incentives found for this filter.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Seller</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {incentives.map((sale) => {
                    const seller = sale.incentiveType === 'dealer' ? sale.dealer : sale.distributor;
                    const isActionable = actionableStatuses.includes(sale.incentiveStatus);

                    return (
                      <tr key={sale._id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-sm text-gray-900">{seller?.name || '-'}</td>
                        <td className="px-4 py-4 text-sm capitalize text-gray-700">{sale.incentiveType || '-'}</td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          <div>{sale.product?.productName || '-'}</div>
                          <div className="text-xs text-gray-500">{sale.product?.serialNumber || '-'}</div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          <div>{sale.customerName || '-'}</div>
                          <div className="text-xs text-gray-500">{sale.customerPhone || '-'}</div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900 font-medium">₹{sale.incentiveAmount || 0}</td>
                        <td className="px-4 py-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize
                            ${sale.incentiveStatus === 'approved' ? 'bg-green-100 text-green-800' :
                              sale.incentiveStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                              sale.incentiveStatus === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' :
                              sale.incentiveStatus === 'incomplete' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'}`}>
                            {sale.incentiveStatus?.replaceAll('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {isActionable ? (
                            <div className="flex min-w-[280px] flex-col gap-2">
                              <textarea
                                value={rejectionNotes[sale._id] || ''}
                                onChange={(e) =>
                                  setRejectionNotes((prev) => ({
                                    ...prev,
                                    [sale._id]: e.target.value,
                                  }))
                                }
                                rows={2}
                                placeholder="Rejection reason (required to reject)"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs text-gray-700"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleApprove(sale._id)}
                                  disabled={actingSaleId === sale._id}
                                  className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(sale._id)}
                                  disabled={actingSaleId === sale._id}
                                  className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">
                              {sale.incentiveRejectionNote || (sale.adminTouchedForm ? 'Admin touched form' : 'No actions')}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
