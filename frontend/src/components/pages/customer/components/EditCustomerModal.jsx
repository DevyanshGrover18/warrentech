import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { X, Edit } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

const EditCustomerModal = ({ isOpen, onClose, customer, onUpdate, initialMode = 'edit' }) => {
  const [mode, setMode] = useState(initialMode);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    state: '',
    city: '',
    plumberName: '',
    plumberPhone: '',
    password: '',
  });
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode);
  }, [isOpen, initialMode]);

  useEffect(() => {
    const fetchStates = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/locations/states`);
        setStates(response.data || []);
      } catch (error) {
        console.error('Error fetching states:', error);
      }
    };
    fetchStates();
  }, []);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        state: customer.state || '',
        city: customer.city || '',
        plumberName: customer.plumberName || '',
        plumberPhone: customer.plumberPhone || '',
        password: '',
      });
    }
  }, [customer]);

  useEffect(() => {
    const fetchCities = async () => {
      if (!formData.state) {
        setCities([]);
        return;
      }
      try {
        const response = await axios.get(`${API_URL}/api/locations/cities/${formData.state}`);
        setCities(response.data || []);
      } catch (error) {
        console.error(`Error fetching cities for ${formData.state}:`, error);
      }
    };
    fetchCities();
  }, [formData.state]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const payload = { ...formData };
      if (!payload.password) delete payload.password;

      await axios.put(`${API_URL}/api/customers/${customer._id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success('Customer updated successfully');
      onUpdate();
      setMode('view');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update customer');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[100] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-white">
          <h2 className="text-2xl font-bold text-gray-900">
            {mode === 'edit' ? `Edit Customer: ${customer.name}` : 'Customer Details'}
          </h2>
          <div className="flex items-center gap-2">
            {mode === 'view' && (
              <button
                onClick={() => setMode('edit')}
                className="p-2 hover:bg-blue-50 rounded-full transition-colors text-blue-600"
                title="Edit Customer"
              >
                <Edit className="h-6 w-6" />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[80vh]">
          {mode === 'edit' ? (
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Password (Optional)</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5"
                    placeholder="Leave blank to keep unchanged"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">State</label>
                  <select
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5"
                  >
                    <option value="">Select State</option>
                    {states.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">City</label>
                  <select
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    disabled={!formData.state}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5 disabled:bg-gray-50"
                  >
                    <option value="">Select City</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>{c}</option>
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
              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setMode('view')}
                  className="px-6 py-2 bg-white text-gray-700 font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 transition-all shadow-lg disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-500 font-medium mb-1 text-xs uppercase tracking-wider">Full Name</p>
                <p className="font-bold text-gray-900">{formData.name || '-'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-500 font-medium mb-1 text-xs uppercase tracking-wider">Phone Number</p>
                <p className="font-bold text-gray-900">{formData.phone || '-'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-500 font-medium mb-1 text-xs uppercase tracking-wider">Email Address</p>
                <p className="font-bold text-gray-900">{formData.email || '-'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg sm:col-span-2">
                <p className="text-gray-500 font-medium mb-1 text-xs uppercase tracking-wider">Address</p>
                <p className="font-bold text-gray-900">{formData.address || '-'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-500 font-medium mb-1 text-xs uppercase tracking-wider">State</p>
                <p className="font-bold text-gray-900">{formData.state || '-'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-500 font-medium mb-1 text-xs uppercase tracking-wider">City</p>
                <p className="font-bold text-gray-900">{formData.city || '-'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-500 font-medium mb-1 text-xs uppercase tracking-wider">Plumber Name</p>
                <p className="font-bold text-gray-900">{formData.plumberName || '-'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-500 font-medium mb-1 text-xs uppercase tracking-wider">Plumber Phone</p>
                <p className="font-bold text-gray-900">{formData.plumberPhone || '-'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditCustomerModal;