import { useState, useEffect, useCallback } from 'react';
import { dealerService } from '../services/dealerService';
import { toast } from 'react-hot-toast';
import { confirmDelete } from '../../../global/deleteConfirm';

export const useDealers = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [dealers, setDealers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [distributors, setDistributors] = useState([]);

    const fetchDealers = useCallback(async () => {
        try {
            setLoading(true);
            const response = await dealerService.fetchDealers(searchTerm);
            setDealers(response.data);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error fetching dealers');
        } finally {
            setLoading(false);
        }
    }, [searchTerm]);

    const fetchDistributors = useCallback(async () => {
        try {
            const response = await dealerService.fetchDistributors();
            setDistributors(response.data);
        } catch (error) {
            toast.error('Error fetching distributors');
        }
    }, []);

    useEffect(() => {
        const debounceSearch = setTimeout(() => {
            fetchDealers();
        }, 300);

        return () => clearTimeout(debounceSearch);
    }, [searchTerm, fetchDealers]);

    useEffect(() => {
        fetchDistributors();
    }, [fetchDistributors]);

    const addDealer = async (dealerData) => {
        try {
            const response = await dealerService.createDealer(dealerData);
            setDealers(prev => [...prev, response.data]);
            toast.success('Dealer added successfully');
            return true;
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error adding dealer');
            return false;
        }
    };

    const updateDealer = async (dealerId, dealerData) => {
        try {
            const response = await dealerService.updateDealer(dealerId, dealerData);
            setDealers(prev => prev.map(d => d._id === dealerId ? response.data : d));
            toast.success('Dealer updated successfully');
            return true;
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error updating dealer');
            return false;
        }
    };

    const deleteDealer = async (dealerId) => {
        const dealer = dealers.find(d => d._id === dealerId);
        const confirmed = await confirmDelete({
            entityLabel: 'dealer',
            itemName: dealer?.name,
        });

        if (!confirmed) return false;

        try {
            await dealerService.deleteDealer(dealerId);
            setDealers(prev => prev.filter(d => d._id !== dealerId));
            toast.success('Dealer deleted successfully');
            return true;
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error deleting dealer');
            return false;
        }
    };

    return {
        searchTerm,
        setSearchTerm,
        dealers,
        loading,
        distributors,
        fetchDealers,
        addDealer,
        updateDealer,
        deleteDealer,
    };
};
