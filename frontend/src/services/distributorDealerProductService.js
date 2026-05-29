import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/api/distributor-dealer-products`;

export const distributorDealerProductService = {
  assignProductToDealer: (assignmentData) => axios.post(`${API_URL}/assign`, assignmentData),
  getDealerProducts: (dealerId) => axios.get(`${API_URL}/dealer/${dealerId}/products`),
  getDistributorAssignedProducts: () => axios.get(`${API_URL}/distributor/assigned`)
};