import { useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { walletService } from '../../../services/walletService';
import { AuthContext } from '../../../context/AuthContext';
import WalletDetailsModal from './components/WalletDetailsModal';

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;

export default function Wallets() {
  const { isAdmin, hasPrivilege } = useContext(AuthContext);
  const canApprovePayouts = isAdmin || hasPrivilege('sales', 'view');
  const [showAllOverviewTransactions, setShowAllOverviewTransactions] = useState(false);
  const [overview, setOverview] = useState({
    distributors: [],
    dealers: [],
    recentTransactions: [],
    payoutRequests: [],
  });
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showManualDebitModal, setShowManualDebitModal] = useState(false);
  const [manualDebitAmount, setManualDebitAmount] = useState('');
  const [manualDebitNotes, setManualDebitNotes] = useState('');
  const [manualDebitLoading, setManualDebitLoading] = useState(false);
  const [approvalModal, setApprovalModal] = useState({ open: false, request: null });
  const [approvalProof, setApprovalProof] = useState(null);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [rejectionReasons, setRejectionReasons] = useState({});
  const [rejectionLoading, setRejectionLoading] = useState(false);

  const [saleEditDeadline, setSaleEditDeadline] = useState({ value: 24, unit: 'hrs' });
  const [savingDeadline, setSavingDeadline] = useState(false);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const [data, configResponse] = await Promise.all([
        walletService.getOverview({
          transactionsLimit: showAllOverviewTransactions ? 'all' : 5,
        }),
        axios.get(`${import.meta.env.VITE_API_URL}/api/billing-config`),
      ]);
      setOverview(data || {
        distributors: [],
        dealers: [],
        recentTransactions: [],
        payoutRequests: [],
      });
      if (configResponse.data) {
        setSaleEditDeadline({
          value: configResponse.data.saleEditDeadlineValue || 24,
          unit: configResponse.data.saleEditDeadlineUnit || 'hrs',
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch wallet overview');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDeadline = async () => {
    try {
      setSavingDeadline(true);
      const token = localStorage.getItem('token');
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/billing-config/sale-edit-deadline`,
        {
          saleEditDeadlineValue: saleEditDeadline.value,
          saleEditDeadlineUnit: saleEditDeadline.unit,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Sale edit deadline updated');
    } catch (error) {
      toast.error('Failed to update sale edit deadline');
    } finally {
      setSavingDeadline(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [showAllOverviewTransactions]);

  const loadWalletDetails = async (entityType, entityId, entityName) => {
    setSelectedWallet({ entityType, entityId, entityName });
  };

  const closeWalletDetails = () => {
    setSelectedWallet(null);
  };

  const refreshWalletViews = async (entityType, entityId) => {
    await fetchOverview();
    if (selectedWallet?.entityId === entityId && selectedWallet?.entityType === entityType) {
      setSelectedWallet((prev) => prev ? { ...prev } : prev);
    }
  };

  const pendingPayoutRequests = useMemo(
    () => (overview.payoutRequests || []).filter((item) => item.status === 'pending'),
    [overview.payoutRequests]
  );

  const entityNameMap = useMemo(() => {
    const map = {};

    (overview.distributors || []).forEach((item) => {
      map[`distributor:${item._id}`] = item.name;
    });

    (overview.dealers || []).forEach((item) => {
      map[`dealer:${item._id}`] = item.name;
    });

    return map;
  }, [overview.dealers, overview.distributors]);

  const handleManualDebit = async () => {
    if (!selectedWallet?.entity) return;
    setManualDebitAmount('');
    setManualDebitNotes('');
    setShowManualDebitModal(true);
  };

  const submitManualDebit = async (event) => {
    event.preventDefault();

    if (!selectedWallet?.entity) return;

    try {
      setManualDebitLoading(true);
      await walletService.createManualDebit(selectedWallet.entityType, selectedWallet.entity._id, {
        amount: manualDebitAmount,
        notes: manualDebitNotes,
      });
      toast.success('Manual debit recorded');
      setShowManualDebitModal(false);
      await refreshWalletViews(selectedWallet.entityType, selectedWallet.entity._id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create manual debit');
    } finally {
      setManualDebitLoading(false);
    }
  };

  const openApprovalModal = (request) => {
    setApprovalProof(null);
    setApprovalModal({ open: true, request });
  };

  const submitApproval = async (event) => {
    event.preventDefault();

    if (!approvalModal.request) return;

    try {
      setApprovalLoading(true);
      await walletService.approvePayoutRequest(approvalModal.request._id, {
        paymentProof: approvalProof,
      });
      toast.success('Payout request approved');
      const { entityType, entityId } = approvalModal.request;
      setApprovalModal({ open: false, request: null });
      await refreshWalletViews(entityType, entityId);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve payout request');
    } finally {
      setApprovalLoading(false);
    }
  };

  const submitRejection = async (request) => {
    const note = (rejectionReasons[request._id] || '').trim();

    if (!note) {
      toast.error('A rejection reason is required.');
      return;
    }

    try {
      setRejectionLoading(true);
      await walletService.rejectPayoutRequest(request._id, {
        rejectionReason: note,
      });
      toast.success('Payout request rejected');
      setRejectionReasons((prev) => {
        const next = { ...prev };
        delete next[request._id];
        return next;
      });
      await refreshWalletViews(request.entityType, request.entityId);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject payout request');
    } finally {
      setRejectionLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">Wallet Tracking</h1>
        <p className="mt-1 text-sm text-gray-600">Review distributor and dealer balances, payout requests, transactions, and manual debits.</p>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sale Edit Deadline</h2>
          <div className="flex flex-col sm:flex-row items-end gap-4">
            <div className="flex-1 max-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Value</label>
              <input
                type="number"
                min="1"
                value={saleEditDeadline.value}
                onChange={(e) => setSaleEditDeadline(prev => ({ ...prev, value: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="flex-1 max-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                value={saleEditDeadline.unit}
                onChange={(e) => setSaleEditDeadline(prev => ({ ...prev, unit: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="hrs">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
            <button
              onClick={handleSaveDeadline}
              disabled={savingDeadline}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {savingDeadline ? 'Saving...' : 'Save Deadline'}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500 italic">
            This defines how long distributors and dealers can edit a sale after it is created.
          </p>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-10 text-center text-gray-500">Loading wallets...</div>
      ) : (
        <>
          {canApprovePayouts && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Pending Payout Requests</h2>
                  <p className="text-sm text-gray-600">Approve or reject payout requests from distributors and dealers.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Reason</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Reject Note</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {pendingPayoutRequests.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-6 text-center text-sm text-gray-500">No pending payout requests.</td>
                      </tr>
                    ) : (
                      pendingPayoutRequests.map((item) => (
                        <tr key={item._id}>
                          <td className="px-4 py-4 text-sm capitalize text-gray-900">{item.entityType}</td>
                          <td className="px-4 py-4 text-sm text-gray-700">
                            {entityNameMap[`${item.entityType}:${item.entityId}`] || item.entityId}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-700">{formatCurrency(item.amount)}</td>
                          <td className="px-4 py-4 text-sm text-gray-700">{item.reason || '-'}</td>
                          <td className="px-4 py-4 text-sm text-gray-700">
                            <input
                              type="text"
                              value={rejectionReasons[item._id] || ''}
                              onChange={(e) => setRejectionReasons((prev) => ({
                                ...prev,
                                [item._id]: e.target.value,
                              }))}
                              className="w-full min-w-[180px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                              placeholder="Rejection reason (Required)"
                            />
                          </td>
                          <td className="px-4 py-4 text-sm">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openApprovalModal(item)}
                                className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => submitRejection(item)}
                                disabled={rejectionLoading}
                                className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Wallet Activity</h2>
              {!showAllOverviewTransactions && (
                <button
                  onClick={() => setShowAllOverviewTransactions(true)}
                  className="rounded-md border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
                >
                  Load all transactions
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {overview.recentTransactions.map((item) => (
                    <tr key={item._id}>
                      <td className="px-4 py-4 text-sm capitalize text-gray-900">{item.entityType}</td>
                      <td className="px-4 py-4 text-sm capitalize text-gray-700">{item.source.replaceAll('_', ' ')}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{formatCurrency(item.amount)}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{new Date(item.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selectedWallet && (
        <WalletDetailsModal
          entityType={selectedWallet.entityType}
          entityId={selectedWallet.entityId}
          entityName={selectedWallet.entityName}
          onClose={closeWalletDetails}
        />
      )}

      {showManualDebitModal && selectedWallet?.entity && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !manualDebitLoading && setShowManualDebitModal(false)}></div>
          <div className="relative z-10 w-full max-w-md rounded-lg bg-white shadow-xl">
            <form onSubmit={submitManualDebit}>
              <div className="border-b border-gray-200 p-4">
                <h3 className="text-lg font-semibold text-gray-900">Manual Debit</h3>
                <p className="mt-1 text-sm text-gray-600">
                  {selectedWallet.entity.name} current balance: {formatCurrency(selectedWallet.balance)}
                </p>
              </div>

              <div className="space-y-4 p-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="manualDebitAmount">
                    Amount
                  </label>
                  <input
                    id="manualDebitAmount"
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={manualDebitAmount}
                    onChange={(e) => setManualDebitAmount(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="Enter debit amount"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="manualDebitNotes">
                    Note
                  </label>
                  <textarea
                    id="manualDebitNotes"
                    rows="4"
                    value={manualDebitNotes}
                    onChange={(e) => setManualDebitNotes(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="Reason for debit"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-4">
                <button
                  type="button"
                  onClick={() => setShowManualDebitModal(false)}
                  disabled={manualDebitLoading}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={manualDebitLoading}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {manualDebitLoading ? 'Recording...' : 'Record Debit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {approvalModal.open && approvalModal.request && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !approvalLoading && setApprovalModal({ open: false, request: null })}></div>
          <div className="relative z-10 w-full max-w-md rounded-lg bg-white shadow-xl">
            <form onSubmit={submitApproval}>
              <div className="border-b border-gray-200 p-4">
                <h3 className="text-lg font-semibold text-gray-900">Approve Payout Request</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Amount: {formatCurrency(approvalModal.request.amount)}
                </p>
              </div>

              <div className="space-y-4 p-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="paymentProof">
                    Payment proof image (optional)
                  </label>
                  <input
                    id="paymentProof"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setApprovalProof(e.target.files?.[0] || null)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-4">
                <button
                  type="button"
                  onClick={() => setApprovalModal({ open: false, request: null })}
                  disabled={approvalLoading}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={approvalLoading}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {approvalLoading ? 'Approving...' : 'Approve and Deduct'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
