import { useContext, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { incentiveService } from '../../../services/incentiveService';
import { AuthContext } from '../../../context/AuthContext';

const statusOptions = ['all', 'incomplete', 'pending_approval', 'approved', 'rejected'];
const actionableStatuses = ['incomplete', 'pending_approval'];

export default function Incentives() {
  const { isAdmin } = useContext(AuthContext);
  const [status, setStatus] = useState('all');
  const [incentives, setIncentives] = useState([]);
  const [settings, setSettings] = useState({
    distributorPerSaleIncentive: 0,
    dealerPerSaleIncentive: 0,
  });
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [actingSaleId, setActingSaleId] = useState(null);
  const [rejectionNotes, setRejectionNotes] = useState({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const [incentiveData, settingsData] = await Promise.all([
        incentiveService.getIncentives(status),
        incentiveService.getSettings(),
      ]);
      setIncentives(incentiveData || []);
      setSettings({
        distributorPerSaleIncentive: settingsData?.distributorPerSaleIncentive || 0,
        dealerPerSaleIncentive: settingsData?.dealerPerSaleIncentive || 0,
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load incentives');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [status]);

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

  const handleSettingChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      await incentiveService.updateSettings({
        distributorPerSaleIncentive: Number(settings.distributorPerSaleIncentive) || 0,
        dealerPerSaleIncentive: Number(settings.dealerPerSaleIncentive) || 0,
      });
      toast.success('Incentive settings updated');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update incentive settings');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Incentives</h1>
            <p className="text-sm text-gray-600 mt-1">Approve eligible seller incentives and review sale status.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
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

      {isAdmin && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Per-Sale Incentive Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Distributor incentive</label>
              <input
                type="number"
                min="0"
                value={settings.distributorPerSaleIncentive}
                onChange={(e) => handleSettingChange('distributorPerSaleIncentive', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dealer incentive</label>
              <input
                type="number"
                min="0"
                value={settings.dealerPerSaleIncentive}
                onChange={(e) => handleSettingChange('dealerPerSaleIncentive', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {savingSettings ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading incentives...</div>
        ) : incentives.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No incentives found for this filter.</div>
        ) : (
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
                    <tr key={sale._id}>
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
                      <td className="px-4 py-4 text-sm text-gray-900">₹{sale.incentiveAmount || 0}</td>
                      <td className="px-4 py-4 text-sm capitalize text-gray-700">{sale.incentiveStatus?.replaceAll('_', ' ')}</td>
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
        )}
      </div>
    </div>
  );
}
