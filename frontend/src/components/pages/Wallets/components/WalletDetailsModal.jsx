import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { walletService } from '../../../../services/walletService';

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;

export default function WalletDetailsModal({ entityType, entityId, entityName, onClose }) {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingAll, setLoadingAll] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  const loadWallet = async ({ allTransactions = false } = {}) => {
    try {
      if (allTransactions) {
        setLoadingAll(true);
      } else {
        setLoading(true);
      }

      const data = await walletService.getEntityWallet(entityType, entityId, {
        transactionsLimit: allTransactions ? 'all' : 5,
      });

      setWallet(data);
      setShowAllTransactions(allTransactions);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch wallet details');
    } finally {
      setLoading(false);
      setLoadingAll(false);
    }
  };

  useEffect(() => {
    loadWallet();
  }, [entityId, entityType]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative z-10 w-full max-w-4xl rounded-lg bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{entityName}</h3>
            <p className="text-sm text-gray-600">
              Current balance: {formatCurrency(wallet?.balance || 0)}
            </p>
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto p-4">
          {loading ? (
            <div className="py-10 text-center text-gray-500">Loading wallet details...</div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Wallet balance</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  {formatCurrency(wallet?.balance || 0)}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-4">
                  <h4 className="text-base font-semibold text-gray-900">Transactions</h4>
                  {!showAllTransactions && (wallet?.transactions || []).length >= 5 && (
                    <button
                      onClick={() => loadWallet({ allTransactions: true })}
                      disabled={loadingAll}
                      className="rounded-md border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                    >
                      {loadingAll ? 'Loading...' : 'Load all transactions'}
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Source</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Note</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {(wallet?.transactions || []).length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-4 py-6 text-center text-sm text-gray-500">
                            No transactions found.
                          </td>
                        </tr>
                      ) : (
                        (wallet?.transactions || []).map((item) => (
                          <tr key={item._id}>
                            <td className="px-4 py-4 text-sm capitalize text-gray-900">{item.source.replaceAll('_', ' ')}</td>
                            <td className="px-4 py-4 text-sm capitalize text-gray-700">{item.type}</td>
                            <td className="px-4 py-4 text-sm text-gray-700">{formatCurrency(item.amount)}</td>
                            <td className="px-4 py-4 text-sm text-gray-700">{item.notes || '-'}</td>
                            <td className="px-4 py-4 text-sm text-gray-700">{new Date(item.createdAt).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
