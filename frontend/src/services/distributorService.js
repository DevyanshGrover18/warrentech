import axios from 'axios';
import { buildQueryString } from './buildQueryString';

const API_URL = `${import.meta.env.VITE_API_URL}/api/distributors`;

export const distributorService = {
  fetchDistributors: async (params = {}) => {
    const response = await axios.get(`${API_URL}${buildQueryString(params)}`);
    return response.data;
  },
  createDistributor: async (payload) => {
    const response = await axios.post(API_URL, payload);
    return response.data;
  },
  updateDistributor: async (distributorId, payload) => {
    const response = await axios.put(`${API_URL}/${distributorId}`, payload);
    return response.data;
  },
  deleteDistributor: async (distributorId) => {
    const response = await axios.delete(`${API_URL}/${distributorId}`);
    return response.data;
  },
  deleteManyDistributors: async (distributorIds) => {
    const response = await axios.delete(API_URL, {
      data: { distributorIds },
    });
    return response.data;
  },
  updateDistributorStatus: async (distributorId, status) => {
    const response = await axios.patch(`${API_URL}/${distributorId}/status`, { status });
    return response.data;
  },
  fetchDistributorDealers: async (distributorId) => {
    const response = await axios.get(`${API_URL}/${distributorId}/dealers`);
    return response.data;
  },
  fetchDistributorProducts: async (distributorId) => {
    const response = await axios.get(`${API_URL}/${distributorId}/products`);
    return response.data;
  },
  updateExecutiveAssignment: async (distributorId, payload) => {
    const response = await axios.patch(`${API_URL}/${distributorId}/executive-assignment`, payload);
    return response.data;
  },
};
