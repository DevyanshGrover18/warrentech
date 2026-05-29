import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { usePaginatedList } from '../../../../hooks/usePaginatedList';
import { distributorService } from '../../../../services/distributorService';

export function useDistributorList() {
  const fetchDistributorsPage = useCallback(async (params) => (
    await distributorService.fetchDistributors(params)
  ), []);

  return usePaginatedList(fetchDistributorsPage, {
    initialLimit: 10,
    initialFilters: {
      state: 'all',
    },
    onError: (fetchError) => {
      toast.error(fetchError.response?.data?.message || 'Error fetching distributors');
    },
  });
}
