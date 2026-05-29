import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { confirmDelete } from '../../../global/deleteConfirm';
import { usePaginatedList } from '../../../../hooks/usePaginatedList';
import { dealerService } from '../services/dealerService';
import { distributorService } from '../../../../services/distributorService';

export const useDealers = () => {
    const [distributors, setDistributors] = useState([]);

    const fetchDealersPage = useCallback(async (params) => {
        return await dealerService.fetchDealers(params);
    }, []);

    const {
        items: dealers,
        loading,
        error,
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
        refresh,
    } = usePaginatedList(fetchDealersPage, {
        initialLimit: 10,
        initialFilters: {
            state: 'all',
            distributorId: 'all'
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Error fetching dealers')
    });

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const distributorsData = await distributorService.fetchDistributors({ paginate: false });
                setDistributors(distributorsData || []);
            } catch (err) {
                toast.error('Failed to load distributors');
            }
        };
        fetchInitialData();
    }, []);

    const addDealer = async (dealerData) => {
        try {
            await dealerService.createDealer(dealerData);
            await refresh();
            toast.success('Dealer added successfully');
            return true;
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error adding dealer');
            return false;
        }
    };

    const updateDealer = async (dealerId, dealerData) => {
        try {
            await dealerService.updateDealer(dealerId, dealerData);
            await refresh();
            toast.success('Dealer updated successfully');
            return true;
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error updating dealer');
            return false;
        }
    };

    const deleteDealer = async (dealerId, dealerName) => {
        const confirmed = await confirmDelete({
            entityLabel: 'dealer',
            itemName: dealerName
        });

        if (!confirmed) return false;

        try {
            await dealerService.deleteDealer(dealerId);
            await refresh();
            toast.success('Dealer deleted successfully');
            return true;
        } catch (requestError) {
            toast.error(requestError.response?.data?.message || 'Error deleting dealer');
            return false;
        }
    };

    const resetDealerFilters = useCallback(() => {
        resetFilters();
    }, [resetFilters]);

    return {
        dealers,
        distributors,
        loading,
        error,
        page,
        limit,
        totalItems,
        totalPages,
        searchTerm,
        stateFilter: filters.state,
        distributorFilter: filters.distributorId,
        setPage,
        setLimit,
        setSearchTerm,
        setStateFilter: (value) => setFilter('state', value),
        setDistributorFilter: (value) => setFilter('distributorId', value),
        resetFilters: resetDealerFilters,
        refresh,
        addDealer,
        updateDealer,
        deleteDealer,
    };
};
