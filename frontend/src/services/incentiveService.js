import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/api/incentives`;

export const incentiveService = {
  getIncentives: async (status = 'all', limit = null, page = 1) => {
    let url = `${API_URL}?status=${status}`;
    if (limit) {
      url += `&limit=${limit}&page=${page}`;
    }
    const response = await axios.get(url);
    return response.data;
  },
  getSettings: async () => {
    const response = await axios.get(`${API_URL}/settings`);
    return response.data;
  },
  updateSettings: async (payload) => {
    const response = await axios.put(`${API_URL}/settings`, payload);
    return response.data;
  },
  approve: async (saleId) => {
    const response = await axios.post(`${API_URL}/${saleId}/approve`);
    return response.data;
  },
  reject: async (saleId, note) => {
    const response = await axios.post(`${API_URL}/${saleId}/reject`, { note });
    return response.data;
  },
};
