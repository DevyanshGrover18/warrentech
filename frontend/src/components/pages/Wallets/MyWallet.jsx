import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { walletService } from '../../../services/walletService';

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;

export default function MyWallet() {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestAmount, setRequestAmount] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const data = await walletService.getOwnWallet();
      setWallet(data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch wallet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const submitPayoutRequest = async (event) => {
    event.preventDefault();

    try {
      setRequestLoading(true);
      await walletService.createPayoutRequest({
        amount: requestAmount,
        reason: requestReason,
      });
      toast.success('Payout request submitted');
      setRequestAmount('');
      setRequestReason('');
      fetchWallet();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit payout request');
    } finally {
      setRequestLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">My Wallet</h1>
        <p className="mt-1 text-sm text-gray-600">Track credits, deductions, and raise payout requests against your current wallet balance.</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-10 text-center text-gray-500">Loading wallet...</div>
      ) : !wallet ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-10 text-center text-gray-500">Wallet not found.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-1">
              <div className="text-sm text-gray-500">Current balance</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{formatCurrency(wallet.balance)}</div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-2">
              <h2 className="text-lg font-semibold text-gray-900">Request Wallet Payout</h2>
              <p className="mt-1 text-sm text-gray-600">You can request up to your current wallet balance. Admin and sales-access staff can approve it.</p>

              <form onSubmit={submitPayoutRequest} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="requestAmount">
                    Amount
                  </label>
                  <input
                    id="requestAmount"
                    type="number"
                    min="1"
                    max={wallet.balance || 0}
                    step="0.01"
                    required
                    value={requestAmount}
                    onChange={(e) => setRequestAmount(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="Enter payout amount"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="requestReason">
                    Reason (optional)
                  </label>
                  <input
                    id="requestReason"
                    type="text"
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="Add a short note"
                  />
                </div>

                <div className="md:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={requestLoading}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {requestLoading ? 'Submitting...' : 'Raise Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payout Requests</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Proof</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {(wallet.payoutRequests || []).length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-6 text-center text-sm text-gray-500">No payout requests yet.</td>
                    </tr>
                  ) : (
                    (wallet.payoutRequests || []).map((item) => {
                      const proofUrl = item.paymentProofPath ? `${import.meta.env.VITE_API_URL}/${item.paymentProofPath}` : '';

                      return (
                        <tr key={item._id}>
                          <td className="px-4 py-4 text-sm text-gray-900">{formatCurrency(item.amount)}</td>
                          <td className="px-4 py-4 text-sm text-gray-700">{item.reason || '-'}</td>
                          <td className="px-4 py-4 text-sm capitalize text-gray-700">{item.status}</td>
                          <td className="px-4 py-4 text-sm text-gray-700">
                            {proofUrl ? (
                              <a href={proofUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                View proof
                              </a>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-700">{new Date(item.createdAt).toLocaleString()}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Transaction History</h2>
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
                  {(wallet.transactions || []).map((item) => (
                    <tr key={item._id}>
                      <td className="px-4 py-4 text-sm capitalize text-gray-900">{item.source.replaceAll('_', ' ')}</td>
                      <td className="px-4 py-4 text-sm capitalize text-gray-700">{item.type}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{formatCurrency(item.amount)}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{item.notes || '-'}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{new Date(item.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
