import axios from 'axios';
import { buildQueryString } from '../../../../services/buildQueryString';

const API_URL = `${import.meta.env.VITE_API_URL}/api/dealers`;
const DISTRIBUTOR_API_URL = `${import.meta.env.VITE_API_URL}/api/distributors`;

export const dealerService = {
    fetchDealers: async (params = {}) => {
        const response = await axios.get(`${API_URL}${buildQueryString(params)}`);
        return response.data;
    },

    createDealer: async (dealerData) => {
        return await axios.post(API_URL, dealerData);
    },

    updateDealer: async (dealerId, dealerData) => {
        return await axios.put(`${API_URL}/${dealerId}`, dealerData);
    },

    deleteDealer: async (dealerId) => {
        return await axios.delete(`${API_URL}/${dealerId}`);
    },

    deleteManyDealers: async (dealerIds) => {
        return await axios.delete(API_URL, {
            data: { dealerIds },
        });
    },

    fetchDistributors: async (params = {}) => {
        return await axios.get(`${DISTRIBUTOR_API_URL}${buildQueryString(params)}`);
    }
};
