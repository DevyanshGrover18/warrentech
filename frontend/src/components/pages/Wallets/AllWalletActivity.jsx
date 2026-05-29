import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { walletService } from '../../../services/walletService';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;

export default function AllWalletActivity() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await walletService.getTransactions({
        limit: itemsPerPage,
        page: currentPage,
      });
      setTransactions(response.data || []);
      setTotalPages(response.totalPages || 1);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage]);

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <nav className="flex mb-2" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link to="/wallets" className="text-sm text-gray-500 hover:text-blue-600">Wallets</Link>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <span className="ml-1 text-sm font-medium text-gray-700 md:ml-2">All Activity</span>
              </div>
            </li>
          </ol>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">All Wallet Activity</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No transactions found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {transactions.map((item) => (
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm text-gray-900">{item.entityName || '-'}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {item.type === 'credit' ? 'Added to wallet' : 'Deducted from wallet'}
                      </td>
                      <td className={`px-4 py-4 text-sm font-medium ${item.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                        {item.type === 'credit' ? '+' : '-'}{formatCurrency(item.amount)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">{new Date(item.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
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
