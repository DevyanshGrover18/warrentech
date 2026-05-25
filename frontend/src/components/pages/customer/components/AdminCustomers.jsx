import React, { useState, useEffect } from 'react';
import { getCustomers, getCustomerPurchases } from '../services/customerService';
import { toast } from 'react-hot-toast';
import { ShoppingCart, X, Edit, Trash2, Plus, Eye } from 'lucide-react';
import EditCustomerModal from './EditCustomerModal';
import AddCustomerModal from './AddCustomerModal';
import { CustomerFilters } from './CustomerFilters';
import ExportToExcelButton from '../../../global/ExportToExcelButton';
import ExportToPdfButton from '../../../global/ExportToPdfButton';
import axios from 'axios';
import { confirmDelete } from '../../../global/deleteConfirm';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editModalInitialMode, setEditModalInitialMode] = useState('edit');
  const [purchases, setPurchases] = useState([]);
  const [pLoading, setPLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [stateFilter, setStateFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');

  // Pagination State for customers
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Pagination State for purchases modal
  const [purchasesItemsPerPage, setPurchasesItemsPerPage] = useState(5);
  const [purchasesCurrentPage, setPurchasesCurrentPage] = useState(1);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (err) {
      toast.error('Error fetching customers');
      console.error('Error fetching customers:', err);
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
        } catch (error) {
            console.error('Error fetching states:', error);
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
        };
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/locations/cities/${state}`);
            setCities(response.data);
        } catch (error) {
            console.error(`Error fetching cities for ${state}:`, error);
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
      setPurchasesCurrentPage(1); // Reset to first page when opening
    } catch (err) {
      toast.error('Error fetching purchases');
      console.error('Error fetching purchases:', err);
    } finally {
      setPLoading(false);
    }
  };

  const openEditModal = (customer) => {
    setEditingCustomer(customer);
    setEditModalOpen(true);
  };

  const handleAddCustomer = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/api/customers`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Customer added successfully');
      setAddModalOpen(false);
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add customer');
      throw error;
    }
  };

  const deleteCustomers = async (ids) => {
    try {
        const token = localStorage.getItem('token');
        await axios.delete(`${import.meta.env.VITE_API_URL}/api/customers`, {
            headers: { Authorization: `Bearer ${token}` },
            data: { ids },
        });
    } catch (error) {
        throw error;
    }
  };

  const handleSelectCustomer = (id) => {
    setSelectedCustomers(prev =>
        prev.includes(id) ? prev.filter(customerId => customerId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
      if (selectedCustomers.length === paginatedCustomers.length) {
          setSelectedCustomers([]);
      } else {
          setSelectedCustomers(paginatedCustomers.map(c => c._id));
      }
  };

  const handleDeleteSelected = async () => {
      const confirmed = await confirmDelete({
          entityLabel: 'customer',
          entityLabelPlural: 'customers',
          count: selectedCustomers.length,
      });

      if (!confirmed) return;

      try {
          await deleteCustomers(selectedCustomers);
          toast.success('Selected customers deleted successfully');
          fetchCustomers();
          setSelectedCustomers([]);
      } catch (error) {
          toast.error('Failed to delete selected customers');
      }
  };

  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchQuery.toLowerCase();
    const matchSearch = (
        customer.name.toLowerCase().includes(searchLower) ||
        customer.phone.includes(searchLower)
    );

    const matchState = stateFilter === 'all' || customer.state === stateFilter;
    const matchCity = cityFilter === 'all' || customer.city === cityFilter;

    return matchSearch && matchState && matchCity;
  });

  const uniqueStates = [...new Set(customers.map(c => c.state).filter(Boolean))];
  const uniqueCities = [...new Set(customers.filter(c => c.state === stateFilter).map(c => c.city).filter(Boolean))];

  useEffect(() => {
    setStates(uniqueStates);
  }, [customers]);

  useEffect(() => {
    setCities(uniqueCities);
  }, [stateFilter, customers]);

  // Apply Pagination for customers
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);

  // Apply Pagination for purchases
  const purchasesTotalPages = Math.ceil(purchases.length / purchasesItemsPerPage);
  const indexOfLastPurchase = purchasesCurrentPage * purchasesItemsPerPage;
  const indexOfFirstPurchase = indexOfLastPurchase - purchasesItemsPerPage;
  const paginatedPurchases = purchases.slice(indexOfFirstPurchase, indexOfLastPurchase);

  // Export columns definition
  const customersColumns = [
    { header: 'Name', accessor: 'Name' },
    { header: 'Phone', accessor: 'Phone' },
    { header: 'Email', accessor: 'Email' },
    { header: 'Address', accessor: 'Address' },
    { header: 'City', accessor: 'City' },
    { header: 'State', accessor: 'State' },
    { header: 'Products Count', accessor: 'Products Count' },
  ];

  // Export data function
  const getExportData = () => {
    return filteredCustomers.map(customer => ({
      'Name': customer.name || '-',
      'Phone': customer.phone || '-',
      'Email': customer.email || '-',
      'Address': customer.address || '-',
      'City': customer.city || '-',
      'State': customer.state || '-',
      'Products Count': customer.purchaseCount || 0,
    }));
  };

  return (
  <div className='p-4'>
    <div className="p-6 bg-white mt-2 rounded-lg">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-900 mt-1">Total {filteredCustomers.length}</p>
        </div>
        <div className="flex items-center space-x-2">
          <ExportToExcelButton getData={getExportData} filename="customers-export" />
          <ExportToPdfButton getData={getExportData} columns={customersColumns} filename="customers-export" />
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </button>
        </div>
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
        <div className="flex justify-end items-center mb-4">
            {selectedCustomers.length > 0 && (
                <button
                    onClick={handleDeleteSelected}
                    className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete ({selectedCustomers.length})
                </button>
            )}
        </div>
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
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedCustomers.length === paginatedCustomers.length && paginatedCustomers.length > 0}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">No customers found.</td>
                  </tr>
                ) : (
                  paginatedCustomers.map((c) => (
                    <tr key={c._id} className={selectedCustomers.includes(c._id) ? 'bg-gray-100' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedCustomers.includes(c._id)}
                          onChange={() => handleSelectCustomer(c._id)}
                        />
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{c.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{c.phone}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{c.email || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{c.address || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <button
                          onClick={() => openPurchases(c)}
                          className="inline-flex items-center px-2.5 py-1.5 border border-[#4d55f5] text-xs font-medium rounded text-[#4d55f5] hover:bg-[#4d55f5] hover:text-white transition"
                        >
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          {c.purchaseCount || 0} Products
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => {
                                setEditingCustomer(c);
                                setEditModalInitialMode('view');
                                setEditModalOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Details"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                                setEditingCustomer(c);
                                setEditModalInitialMode('edit');
                                setEditModalOpen(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit Customer"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination Footer for customers */}
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
            ) : purchases.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-16 w-16 mx-auto text-gray-400" />
                <h3 className="text-lg font-medium mt-4">No purchases</h3>
                <p className="text-sm text-gray-500">This customer hasn't bought anything.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto mt-4">
                  <table className="min-w-full border border-gray-200 text-sm divide-y divide-gray-200">
                    <thead className="bg-gray-50 text-left">
                      <tr>
                        <th className="px-4 py-2">Product</th>
                        <th className="px-4 py-2">Serial No.</th>
                        <th className="px-4 py-2 whitespace-nowrap">Bought On</th>
                        <th className="px-4 py-2">Seller</th>
                        <th className="px-4 py-2">Plumber</th>
                        <th className="px-4 py-2">Warranty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedPurchases.map((sale) => {
                        const productName = sale.product?.productName || sale.product?.model?.name || "-";
                        const serial = sale.product?.serialNumber || "-";
                        const soldAt = sale.soldAt ? new Date(sale.soldAt) : new Date(sale.createdAt);
                        const sellerName = sale.dealer?.name || sale.distributor?.name || "-";
                        const warranty = sale.warrantyInfo;

                        return (
                          <tr key={sale._id} className="hover:bg-gray-50">
                            <td className="px-4 py-2">{productName}</td>
                            <td className="px-4 py-2 text-gray-600">{serial}</td>
                            <td className="px-4 py-2">{soldAt.toLocaleDateString()}</td>
                            <td className="px-4 py-2 whitespace-nowrap">{sellerName}</td>
                            <td className="px-4 py-2">{sale.plumberName || "-"}</td>
                            <td className="px-4 py-2">
                              {warranty ? (
                                <div className="flex flex-col text-xs">
                                  <span className={`px-2 py-1 rounded w-fit ${warranty.inWarranty ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                    {warranty.inWarranty ? "In Warranty" : "Expired"}
                                  </span>
                                  <span className="mt-1 text-gray-500">
                                    Expires: {new Date(warranty.expiryDate).toLocaleDateString()}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-500 text-xs">No warranty</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Pagination Footer for purchases */}
                <div className="px-4 py-3 border-t border-gray-200 flex flex-col md:flex-row items-center md:justify-between gap-3 md:gap-0 mt-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-700">
                        <span>Rows per page:</span>
                        <select
                        className="border border-gray-300 rounded px-2 py-1"
                        value={purchasesItemsPerPage}
                        onChange={(e) => {
                            setPurchasesItemsPerPage(Number(e.target.value));
                            setPurchasesCurrentPage(1);
                        }}
                        >
                        {[5, 10, 20].map(num => (
                            <option key={num} value={num}>{num}</option>
                        ))}
                        </select>
                    </div>

                    <div className="hidden md:block text-sm text-gray-700">
                        Showing {purchases.length > 0 ? indexOfFirstPurchase + 1 : 0} to {Math.min(indexOfLastPurchase, purchases.length)} of {purchases.length} purchases
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                        onClick={() => setPurchasesCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={purchasesCurrentPage === 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
                        >
                        Previous
                        </button>

                        <span className="text-sm text-gray-700 hidden md:inline">Page {purchasesCurrentPage} of {purchasesTotalPages}</span>
                        <span className="text-sm text-gray-700 md:hidden"> {purchasesCurrentPage}/{purchasesTotalPages}</span>

                        <button
                        onClick={() => setPurchasesCurrentPage(prev => Math.min(purchasesTotalPages, prev + 1))}
                        disabled={purchasesCurrentPage === purchasesTotalPages}
                        className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
                        >
                        Next
                        </button>
                    </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <AddCustomerModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSave={handleAddCustomer}
      />

      <EditCustomerModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        customer={editingCustomer}
        onUpdate={fetchCustomers}
        initialMode={editModalInitialMode}
      />
    </div>
    </div>
  );
}
