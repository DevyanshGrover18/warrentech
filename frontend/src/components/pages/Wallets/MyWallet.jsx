import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, Clock3, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { walletService } from '../../../services/walletService';

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
const formatDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const getDefaultDateRange = () => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 6);

  return {
    startDate: formatDateInputValue(startDate),
    endDate: formatDateInputValue(endDate),
  };
};

const payoutStatusClasses = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected: 'bg-rose-100 text-rose-800 border-rose-200',
};

const transactionTypeClasses = {
  credit: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  debit: 'bg-rose-100 text-rose-800 border-rose-200',
};

const sourceClasses = {
  sale_incentive: 'bg-blue-100 text-blue-800 border-blue-200',
  wallet_payout: 'bg-violet-100 text-violet-800 border-violet-200',
  manual_adjustment: 'bg-slate-100 text-slate-700 border-slate-200',
};

const getPayoutStatusClass = (status) => payoutStatusClasses[status] || 'bg-gray-100 text-gray-700 border-gray-200';
const getTransactionTypeClass = (type) => transactionTypeClasses[type] || 'bg-gray-100 text-gray-700 border-gray-200';
const getSourceClass = (source) => sourceClasses[source] || 'bg-gray-100 text-gray-700 border-gray-200';

export default function MyWallet() {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestAmount, setRequestAmount] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [showPayoutsModal, setShowPayoutsModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('all');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState('all');
  const [payoutDateRange, setPayoutDateRange] = useState(() => getDefaultDateRange());
  const [transactionDateRange, setTransactionDateRange] = useState(() => getDefaultDateRange());

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

  const payoutPreview = useMemo(
    () => (wallet?.payoutRequests || []).slice(0, 5),
    [wallet?.payoutRequests]
  );

  const transactionPreview = useMemo(
    () => (wallet?.transactions || []).slice(0, 5),
    [wallet?.transactions]
  );

  const filteredPayouts = useMemo(() => {
    const items = wallet?.payoutRequests || [];
    return items.filter((item) => {
      const createdDate = formatDateInputValue(new Date(item.createdAt));
      const matchesStatus = payoutStatusFilter === 'all' || item.status === payoutStatusFilter;
      const matchesStartDate = !payoutDateRange.startDate || createdDate >= payoutDateRange.startDate;
      const matchesEndDate = !payoutDateRange.endDate || createdDate <= payoutDateRange.endDate;

      return matchesStatus && matchesStartDate && matchesEndDate;
    });
  }, [payoutDateRange.endDate, payoutDateRange.startDate, payoutStatusFilter, wallet?.payoutRequests]);

  const filteredTransactions = useMemo(() => {
    const items = wallet?.transactions || [];
    return items.filter((item) => {
      const createdDate = formatDateInputValue(new Date(item.createdAt));
      const matchesType = transactionTypeFilter === 'all' || item.type === transactionTypeFilter;
      const matchesStartDate = !transactionDateRange.startDate || createdDate >= transactionDateRange.startDate;
      const matchesEndDate = !transactionDateRange.endDate || createdDate <= transactionDateRange.endDate;

      return matchesType && matchesStartDate && matchesEndDate;
    });
  }, [transactionDateRange.endDate, transactionDateRange.startDate, transactionTypeFilter, wallet?.transactions]);

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

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Wallet Activity</h2>
                <p className="mt-1 text-sm text-gray-600">Your latest 5 payout requests and 5 wallet transactions in one place.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Payout Requests</h3>
                    <p className="text-xs text-gray-600">Withdrawal requests and approval status in this date range.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-gray-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      {(wallet.payoutRequests || []).length} total
                    </div>
                    <button
                      onClick={() => setShowPayoutsModal(true)}
                      className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-50"
                    >
                      Show All
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {payoutPreview.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
                      No payout requests yet.
                    </div>
                  ) : (
                    payoutPreview.map((item) => {
                      const proofUrl = item.paymentProofPath ? `${import.meta.env.VITE_API_URL}/${item.paymentProofPath}` : '';

                      return (
                        <div key={item._id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{formatCurrency(item.amount)}</div>
                              <div className="mt-1 text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</div>
                            </div>
                            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getPayoutStatusClass(item.status)}`}>
                              {item.status}
                            </span>
                          </div>
                          <div className="mt-3 text-sm text-gray-700">{item.reason || 'No reason added.'}</div>
                          <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                            <span className="text-gray-500">
                              {item.rejectionReason ? `Rejected: ${item.rejectionReason}` : 'Awaiting payout decision'}
                            </span>
                            {proofUrl ? (
                              <a href={proofUrl} target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:underline">
                                View proof
                              </a>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Transactions</h3>
                    <p className="text-xs text-gray-600">Credits and debits recorded in this date range.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-gray-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {(wallet.transactions || []).length} total
                    </div>
                    <button
                      onClick={() => setShowTransactionsModal(true)}
                      className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
                    >
                      Show All
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {transactionPreview.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
                      No transactions yet.
                    </div>
                  ) : (
                    transactionPreview.map((item) => (
                      <div key={item._id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className={`rounded-full p-2 ${item.type === 'credit' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {item.type === 'credit' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                            </div>
                            <div>
                              <div className="text-sm font-semibold capitalize text-gray-900">{item.source.replaceAll('_', ' ')}</div>
                              <div className="mt-1 text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</div>
                            </div>
                          </div>
                          <div className={`text-sm font-bold ${item.type === 'credit' ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {item.type === 'credit' ? '+' : '-'}{formatCurrency(item.amount)}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getTransactionTypeClass(item.type)}`}>
                            {item.type}
                          </span>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getSourceClass(item.source)}`}>
                            {item.source.replaceAll('_', ' ')}
                          </span>
                        </div>
                        <div className="mt-3 text-sm text-gray-600">{item.notes || 'No note added.'}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showPayoutsModal && wallet && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPayoutsModal(false)}></div>
          <div className="relative z-10 flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="border-b border-gray-200 bg-gradient-to-r from-amber-50 via-white to-orange-50 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">All Payout Requests</h2>
                  <p className="mt-1 text-sm text-gray-600">Review payout requests for the selected date range with status-based filtering.</p>
                </div>
                <button
                  onClick={() => setShowPayoutsModal(false)}
                  className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500" htmlFor="payoutModalStartDate">
                      From
                    </label>
                    <input
                      id="payoutModalStartDate"
                      type="date"
                      value={payoutDateRange.startDate}
                      max={payoutDateRange.endDate}
                      onChange={(e) => setPayoutDateRange((current) => ({ ...current, startDate: e.target.value }))}
                      className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500" htmlFor="payoutModalEndDate">
                      To
                    </label>
                    <input
                      id="payoutModalEndDate"
                      type="date"
                      value={payoutDateRange.endDate}
                      min={payoutDateRange.startDate}
                      onChange={(e) => setPayoutDateRange((current) => ({ ...current, endDate: e.target.value }))}
                      className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-700"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-amber-600" />
                  <select
                    value={payoutStatusFilter}
                    onChange={(e) => setPayoutStatusFilter(e.target.value)}
                    className="rounded-full border border-amber-200 bg-white px-4 py-2 text-sm text-gray-700"
                  >
                    <option value="all">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {filteredPayouts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/50 px-6 py-14 text-center text-sm text-gray-500">
                  No payout requests found for this filter.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-amber-100">
                  <table className="min-w-full divide-y divide-amber-100">
                    <thead className="bg-amber-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Reason</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Proof</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Rejection Note</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100 bg-white">
                      {filteredPayouts.map((item) => {
                        const proofUrl = item.paymentProofPath ? `${import.meta.env.VITE_API_URL}/${item.paymentProofPath}` : '';

                        return (
                          <tr key={item._id}>
                            <td className="px-4 py-4 text-sm font-semibold text-gray-900">{formatCurrency(item.amount)}</td>
                            <td className="px-4 py-4 text-sm text-gray-700">{item.reason || '-'}</td>
                            <td className="px-4 py-4 text-sm">
                              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getPayoutStatusClass(item.status)}`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-700">
                              {proofUrl ? (
                                <a href={proofUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                  View proof
                                </a>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-700">{item.rejectionReason || '-'}</td>
                            <td className="px-4 py-4 text-sm text-gray-700">{new Date(item.createdAt).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showTransactionsModal && wallet && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowTransactionsModal(false)}></div>
          <div className="relative z-10 flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="border-b border-gray-200 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">All Transactions</h2>
                  <p className="mt-1 text-sm text-gray-600">Review wallet credit and debit history for the selected date range.</p>
                </div>
                <button
                  onClick={() => setShowTransactionsModal(false)}
                  className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500" htmlFor="transactionModalStartDate">
                      From
                    </label>
                    <input
                      id="transactionModalStartDate"
                      type="date"
                      value={transactionDateRange.startDate}
                      max={transactionDateRange.endDate}
                      onChange={(e) => setTransactionDateRange((current) => ({ ...current, startDate: e.target.value }))}
                      className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500" htmlFor="transactionModalEndDate">
                      To
                    </label>
                    <input
                      id="transactionModalEndDate"
                      type="date"
                      value={transactionDateRange.endDate}
                      min={transactionDateRange.startDate}
                      onChange={(e) => setTransactionDateRange((current) => ({ ...current, endDate: e.target.value }))}
                      className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-700"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-emerald-600" />
                  <select
                    value={transactionTypeFilter}
                    onChange={(e) => setTransactionTypeFilter(e.target.value)}
                    className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm text-gray-700"
                  >
                    <option value="all">All types</option>
                    <option value="credit">Credits</option>
                    <option value="debit">Debits</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {filteredTransactions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-14 text-center text-sm text-gray-500">
                  No transactions found for this filter.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-emerald-100">
                  <table className="min-w-full divide-y divide-emerald-100">
                    <thead className="bg-emerald-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Source</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Note</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-100 bg-white">
                      {filteredTransactions.map((item) => (
                        <tr key={item._id}>
                          <td className="px-4 py-4 text-sm">
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getSourceClass(item.source)}`}>
                                {item.source.replaceAll('_', ' ')}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm">
                            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getTransactionTypeClass(item.type)}`}>
                              {item.type}
                            </span>
                          </td>
                          <td className={`px-4 py-4 text-sm font-semibold ${item.type === 'credit' ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {item.type === 'credit' ? '+' : '-'}{formatCurrency(item.amount)}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-700">{item.notes || '-'}</td>
                          <td className="px-4 py-4 text-sm text-gray-700">{new Date(item.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
