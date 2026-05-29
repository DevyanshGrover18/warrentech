import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/api/wallets`;

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, value);
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

export const walletService = {
  getOverview: async (params = {}) => {
    const response = await axios.get(`${API_URL}/overview${buildQueryString(params)}`);
    return response.data;
  },
  getTransactions: async (params = {}) => {
    const response = await axios.get(`${API_URL}/transactions${buildQueryString(params)}`);
    return response.data;
  },
  getEntityWallet: async (entityType, entityId, params = {}) => {
    const response = await axios.get(`${API_URL}/${entityType}/${entityId}${buildQueryString(params)}`);
    return response.data;
  },
  getOwnWallet: async (params = {}) => {
    const response = await axios.get(`${API_URL}/me${buildQueryString(params)}`);
    return response.data;
  },
  createPayoutRequest: async (payload) => {
    const response = await axios.post(`${API_URL}/payout-requests`, payload);
    return response.data;
  },
  approvePayoutRequest: async (requestId, payload = {}) => {
    const formData = new FormData();

    if (payload.paymentProof) {
      formData.append('paymentProof', payload.paymentProof);
    }

    const response = await axios.post(`${API_URL}/payout-requests/${requestId}/approve`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  rejectPayoutRequest: async (requestId, payload) => {
    const response = await axios.post(`${API_URL}/payout-requests/${requestId}/reject`, payload);
    return response.data;
  },
  createManualDebit: async (entityType, entityId, payload) => {
    const response = await axios.post(`${API_URL}/${entityType}/${entityId}/manual-debit`, payload);
    return response.data;
  },
};
