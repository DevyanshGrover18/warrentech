import { useEffect, useState } from 'react';
import { Box } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import PaginationBar from '../../global/PaginationBar';
import { DistributorFilters } from '../Distributors/components/DistributorFilters';
import { useDistributorList } from '../Distributors/hooks/useDistributorList';

export default function ExecutiveDistributors() {
  const {
    items: distributors,
    loading,
    page,
    limit,
    totalItems,
    totalPages,
    searchTerm,
    filters,
    setPage,
    setLimit,
    setSearchTerm,
    setFilter,
    resetFilters,
  } = useDistributorList();
  const [states, setStates] = useState([]);

  useEffect(() => {
    const fetchStates = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/locations/states`);
        setStates(response.data);
      } catch (error) {
        toast.error('Error fetching states');
      }
    };

    fetchStates();
  }, []);

  return (
    <div className="p-2">
      <div className="p-2">
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-4 lg:p-6">
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Distributor List</h2>
                <p className="text-sm text-gray-600">Total {totalItems}</p>
              </div>
              <DistributorFilters
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                stateFilter={filters.state}
                onStateFilterChange={(value) => setFilter('state', value)}
                states={states}
                onClearFilters={resetFilters}
              />
            </div>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="py-12 text-center">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-[#4d55f5]"></div>
                <p className="mt-4 text-gray-500">Loading distributors...</p>
              </div>
            ) : distributors.length === 0 ? (
              <div className="py-12 text-center text-gray-500">No distributors found.</div>
            ) : (
              <div className="hidden overflow-hidden md:block">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">City</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">GST Number</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Contact</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Products Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {distributors.map((distributor) => (
                      <tr key={distributor._id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900">{distributor.distributorId}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900">{distributor.name}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900">{distributor.city}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900">{distributor.gstNumber}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900">
                          <div>
                            <p>{distributor.contactPerson}</p>
                            <p className="text-gray-500">{distributor.contactPhone}</p>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="inline-flex items-center rounded border border-[#4d55f5] px-2.5 py-1.5 text-xs font-medium text-[#4d55f5]">
                            <Box className="mr-1 h-4 w-4" />
                            {distributor.productCount || 0} Products
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {!loading && totalItems > 0 ? (
            <PaginationBar
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              limit={limit}
              itemLabel="distributors"
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
