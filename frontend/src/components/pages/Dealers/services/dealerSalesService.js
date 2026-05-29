import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/api/sales`;

// Create a new sale
export const createSale = async (saleData) => {
  try {
    const response = await axios.post(API_URL, saleData);
    return response.data;
  } catch (error) {
    console.error('Error creating sale:', error);
    throw error;
  }
};

// Fetch all sales for a specific dealer
export const getDealerSales = async (dealerId) => {
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/sales/dealer/${dealerId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching dealer sales:', error);
    throw error;
  }
};

// Fetch all sales for a specific sub dealer
export const getSubDealerSales = async (subDealerId) => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/sales/sub-dealer/${subDealerId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching sub dealer sales:', error);
      throw error;
    }
  };

// Update a sale
export const updateSale = async (saleId, saleData) => {
  try {
    const response = await axios.put(`${import.meta.env.VITE_API_URL}/api/sales/${saleId}`, saleData);
    return response.data;
  } catch (error) {
    console.error('Error updating sale:', error);
    throw error;
  }
};
