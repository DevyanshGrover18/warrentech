import React, { useState, useEffect, useMemo } from 'react';
import { getCustomers, getCustomerPurchases } from '../customer/services/customerService';
import { toast } from 'react-hot-toast';
import { ShoppingCart, X } from 'lucide-react';
import { CustomerFilters } from '../customer/components/CustomerFilters';
import axios from 'axios';

export default function ExecutiveCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [pLoading, setPLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [stateFilter, setStateFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (err) {
      toast.error('Error fetching customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, []);

  useEffect(() => {
    const fetchStates = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/locations/states`);
            setStates(response.data);
        } catch (_error) {
        }
    };
    fetchStates();
  }, []);

  useEffect(() => {
    const fetchCities = async (state) => {
        if (!state || state === 'all') {
            setCities([]);
            setCityFilter('all');
            return;
        }
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/locations/cities/${state}`);
            setCities(response.data);
        } catch (_error) {
            setCities([]);
        }
    };
    fetchCities(stateFilter);
  }, [stateFilter]);

  const openPurchases = async (customer) => {
    setSelectedCustomer(customer);
    setModalOpen(true);
    setPLoading(true);
    try {
      const res = await getCustomerPurchases(customer._id);
      setPurchases(res);
    } catch (_err) {
      toast.error('Error fetching purchases');
    } finally {
      setPLoading(false);
    }
  };

  const filteredCustomers = useMemo(() => customers.filter(customer => {
    const searchLower = searchQuery.toLowerCase();
    const matchSearch = (
        customer.name.toLowerCase().includes(searchLower) ||
        customer.phone.includes(searchLower)
    );

    const matchState = stateFilter === 'all' || customer.state === stateFilter;
    const matchCity = cityFilter === 'all' || customer.city === cityFilter;

    return matchSearch && matchState && matchCity;
  }), [customers, searchQuery, stateFilter, cityFilter]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className='p-4'>
      <div className="p-6 bg-white mt-2 rounded-lg">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-900 mt-1">Total {filteredCustomers.length}</p>
        </div>

        <div className="bg-white rounded-lg p-1 mt-4">
          <CustomerFilters
              searchTerm={searchQuery}
              onSearchChange={setSearchQuery}
              stateFilter={stateFilter}
              onStateFilterChange={setStateFilter}
              cityFilter={cityFilter}
              onCityFilterChange={setCityFilter}
              states={states}
              cities={cities}
              onClearFilters={() => {
                  setSearchQuery('');
                  setStateFilter('all');
                  setCityFilter('all');
              }}
          />

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4d55f5] mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading customers...</p>
            </div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedCustomers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">No customers found.</td>
                    </tr>
                  ) : (
                    paginatedCustomers.map((customer) => (
                      <tr key={customer._id}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{customer.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{customer.phone}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{customer.email || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{customer.address || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <button
                            onClick={() => openPurchases(customer)}
                            className="inline-flex items-center px-2.5 py-1.5 border border-[#4d55f5] text-xs font-medium rounded text-[#4d55f5] hover:bg-[#4d55f5] hover:text-white transition"
                          >
                            <ShoppingCart className="h-4 w-4 mr-1" />
                            {customer.purchaseCount || 0} Products
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="px-6 py-3 border-t border-gray-200 flex flex-col md:flex-row items-center md:justify-between gap-3 md:gap-0 mt-2">
                <div className="flex items-center space-x-2 text-sm text-gray-700">
                  <span>Rows per page:</span>
                  <select
                    className="border border-gray-300 rounded px-2 py-1"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    {[10, 25, 50, 75, 100].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                </div>

                <div className="hidden md:block text-sm text-gray-700">
                  Showing {filteredCustomers.length > 0 ? indexOfFirstItem + 1 : 0} to {Math.min(indexOfLastItem, filteredCustomers.length)} of {filteredCustomers.length} customers
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
                  >
                    Previous
                  </button>

                  <span className="text-sm text-gray-700 hidden md:inline">Page {currentPage} of {totalPages}</span>
                  <span className="text-sm text-gray-700 md:hidden"> {currentPage}/{totalPages}</span>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-10">
            <div className="fixed inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
            <div className="relative bg-white rounded-lg shadow-lg w-11/12 max-w-4xl p-6 z-10 overflow-y-auto h-[90vh]">
              <div className="flex justify-between mb-4">
                <h2 className="text-lg font-semibold">Purchases - {selectedCustomer?.name}</h2>
                <button onClick={() => setModalOpen(false)} className="text-gray-500 hover:text-gray-800">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {pLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4d55f5] mx-auto"></div>
                  <p className="mt-4 text-gray-500">Loading purchases...</p>
                </div>
              ) : (
                <div className="overflow-x-auto mt-4">
                  <table className="min-w-full border border-gray-200 text-sm divide-y divide-gray-200">
                    <thead className="bg-gray-50 text-left">
                      <tr>
                        <th className="px-4 py-2">Product</th>
                        <th className="px-4 py-2">Serial No.</th>
                        <th className="px-4 py-2 whitespace-nowrap">Bought On</th>
                        <th className="px-4 py-2">Seller</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {purchases.map((sale) => (
                        <tr key={sale._id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">{sale.product?.productName || sale.product?.model?.name || "-"}</td>
                          <td className="px-4 py-2 text-gray-600">{sale.product?.serialNumber || "-"}</td>
                          <td className="px-4 py-2">{new Date(sale.soldAt || sale.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-2 whitespace-nowrap">{sale.dealer?.name || sale.distributor?.name || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
