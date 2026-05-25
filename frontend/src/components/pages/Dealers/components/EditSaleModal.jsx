import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Edit } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

const EditSaleModal = ({ isOpen, onClose, sale, onSave, initialMode = 'edit' }) => {
  const [mode, setMode] = useState(initialMode);
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    customerState: '',
    customerCity: '',
    plumberName: '',
    plumberPhone: '',
  });
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  useEffect(() => {
    setMode(initialMode);
  }, [isOpen, initialMode]);

  useEffect(() => {
    const fetchStates = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/locations/states`);
        setStates(response.data || []);
      } catch (error) {
        console.error("Error fetching states:", error);
        setStates([]);
      }
    };

    fetchStates();
  }, []);

  useEffect(() => {
    if (sale) {
      setFormData({
        customerName: sale.customerName || sale.customer?.name || '',
        customerPhone: sale.customerPhone || sale.customer?.phone || '',
        customerEmail: sale.customerEmail || sale.customer?.email || '',
        customerAddress: sale.customerAddress || sale.customer?.address || '',
        customerState: sale.customerState || sale.customer?.state || '',
        customerCity: sale.customerCity || sale.customer?.city || '',
        plumberName: sale.plumberName || sale.customer?.plumberName || '',
        plumberPhone: sale.plumberPhone || sale.customer?.plumberPhone || '',
      });
    }
  }, [sale]);

  useEffect(() => {
    const fetchCities = async () => {
      if (!formData.customerState) {
        setCities([]);
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/api/locations/cities/${formData.customerState}`);
        setCities(response.data || []);
      } catch (error) {
        console.error("Error fetching cities:", error);
        setCities([]);
      }
    };

    fetchCities();
  }, [formData.customerState]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    setMode('view');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed z-[100] inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-black/60 transition-opacity" onClick={onClose}></div>
        
        <div className="inline-block align-middle bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-6 pt-5 pb-4 sm:p-8 sm:pb-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                {mode === 'edit' ? 'Edit Sale Details' : 'Customer Details'}
              </h3>
              <div className="flex items-center gap-2">
                {mode === 'view' && (
                  <button
                    onClick={() => setMode('edit')}
                    className="p-2 hover:bg-blue-50 rounded-full transition-colors text-blue-600"
                    title="Edit Details"
                  >
                    <Edit className="h-6 w-6" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {mode === 'edit' ? (
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Customer Name</label>
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => handleChange('customerName', e.target.value)}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Customer Phone</label>
                    <input
                      type="text"
                      value={formData.customerPhone}
                      onChange={(e) => handleChange('customerPhone', e.target.value)}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Customer Email</label>
                    <input
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => handleChange('customerEmail', e.target.value)}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Sale Date</label>
                    <input
                      type="date"
                      value={sale.saleDate ? new Date(sale.saleDate).toISOString().split('T')[0] : ''}
                      readOnly
                      className="w-full rounded-lg border-gray-300 bg-gray-50 shadow-sm border p-2.5 cursor-not-allowed"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Customer Address</label>
                    <input
                      type="text"
                      value={formData.customerAddress}
                      onChange={(e) => handleChange('customerAddress', e.target.value)}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">State</label>
                    <select
                      value={formData.customerState}
                      onChange={(e) => handleChange('customerState', e.target.value)}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5"
                    >
                      <option value="">Select State</option>
                      {states.map((state) => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">City</label>
                    <select
                      value={formData.customerCity}
                      onChange={(e) => handleChange('customerCity', e.target.value)}
                      disabled={!formData.customerState}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5 disabled:bg-gray-50"
                    >
                      <option value="">Select City</option>
                      {cities.map((city) => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Plumber Name</label>
                    <input
                      type="text"
                      value={formData.plumberName}
                      onChange={(e) => handleChange('plumberName', e.target.value)}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Plumber Phone</label>
                    <input
                      type="text"
                      value={formData.plumberPhone}
                      onChange={(e) => handleChange('plumberPhone', e.target.value)}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5"
                    />
                  </div>
                </div>

                <div className="mt-8 flex flex-row-reverse gap-3">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 transition-all shadow-lg"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('view')}
                    className="w-full sm:w-auto px-6 py-2.5 bg-white text-gray-700 font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-500 font-medium mb-1">Name</p>
                  <p className="font-bold text-gray-900 text-base">{formData.customerName || '-'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-500 font-medium mb-1">Phone</p>
                  <p className="font-bold text-gray-900 text-base">{formData.customerPhone || '-'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-500 font-medium mb-1">Email</p>
                  <p className="font-bold text-gray-900 text-base">{formData.customerEmail || '-'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-500 font-medium mb-1">Sale Date</p>
                  <p className="font-bold text-gray-900 text-base">
                    {sale.saleDate ? new Date(sale.saleDate).toLocaleDateString() : '-'}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg sm:col-span-2">
                  <p className="text-gray-500 font-medium mb-1">Address</p>
                  <p className="font-bold text-gray-900 text-base">{formData.customerAddress || '-'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-500 font-medium mb-1">State</p>
                  <p className="font-bold text-gray-900 text-base">{formData.customerState || '-'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-500 font-medium mb-1">City</p>
                  <p className="font-bold text-gray-900 text-base">{formData.customerCity || '-'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-500 font-medium mb-1">Plumber Name</p>
                  <p className="font-bold text-gray-900 text-base">{formData.plumberName || '-'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-500 font-medium mb-1">Plumber Phone</p>
                  <p className="font-bold text-gray-900 text-base">{formData.plumberPhone || '-'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditSaleModal;
