import axios from 'axios';
import { toast } from 'react-hot-toast';
import { confirmDelete } from '../../../global/deleteConfirm';

const API_URL = `${import.meta.env.VITE_API_URL}/api/factories`;

export const getFactories = async (searchTerm) => {
    try {
        const response = await axios.get(searchTerm ? `${API_URL}?search=${searchTerm}` : API_URL);
        return response.data;
    } catch (error) {
        toast.error(error.response?.data?.message || 'Error fetching factories');
        throw error;
    }
};

export const addFactory = async (factoryData) => {
    try {
        const response = await axios.post(API_URL, factoryData);
        toast.success('Factory added successfully');
        return response.data;
    } catch (error) {
        toast.error(error.response?.data?.message || 'Error adding factory');
        throw error;
    }
};

export const updateFactory = async (factoryId, factoryData) => {
    try {
        const response = await axios.put(`${API_URL}/${factoryId}`, factoryData);
        toast.success('Factory updated successfully');
        return response.data;
    } catch (error) {
        toast.error(error.response?.data?.message || 'Error updating factory');
        throw error;
    }
};

export const deleteFactory = async (factoryId) => {
    const confirmed = await confirmDelete({ entityLabel: 'factory' });
    if (!confirmed) return false;

    try {
        await axios.delete(`${API_URL}/${factoryId}`);
        toast.success('Factory deleted successfully');
        return true;
    } catch (error) {
        toast.error(error.response?.data?.message || 'Error deleting factory');
        throw error;
    }
};

export const deleteMultipleFactories = async (factoryIds) => {
    const confirmed = await confirmDelete({
        entityLabel: 'factory',
        entityLabelPlural: 'factories',
        count: factoryIds.length,
    });
    if (!confirmed) return false;

    try {
        await axios.delete(API_URL, { data: { factoryIds } });
        toast.success('Selected factories deleted successfully');
        return true;
    } catch (error) {
        toast.error(error.response?.data?.message || 'Error deleting selected factories');
        throw error;
    }
};

export const getFactoryOrders = async (factoryId) => {
    try {
        const { data } = await axios.get(`${API_URL}/${factoryId}/orders`);
        return data;
    } catch (error) {
        toast.error('Error fetching factory orders');
        console.error('Error:', error);
        throw error;
    }
};

export const updateOrderItemStatus = async (factoryId, itemId, newStatus) => {
    try {
        await axios.patch(`${API_URL}/${factoryId}/orders/${itemId}/status`, {
            status: newStatus
        });
        toast.success(`Status updated to ${newStatus}`);
        return newStatus;
    } catch (error) {
        toast.error('Error updating status');
        throw error;
    }
};

export const bulkUpdateOrderStatus = async (factoryId, itemIds, status) => {
    if (itemIds.length === 0) {
        toast.error('Please select items to update');
        return;
    }
    
    try {
        await axios.patch(`${API_URL}/${factoryId}/orders/bulk-status`, {
            itemIds,
            status
        });
        toast.success(`${itemIds.length} items updated to ${status}`);
    } catch (error) {
        toast.error('Error updating statuses');
        throw error;
    }
};

export const downloadMultiplePDFs = async (boxKeys) => {
    if (boxKeys.length === 0) {
        toast.error('Please select items to download PDFs');
        return;
    }

    try {
        const response = await axios.post(
            `${import.meta.env.VITE_API_URL}/api/pdf/download-multiple`,
            { boxKeys },
            { responseType: 'blob' }
        );

        const blob = new Blob([response.data], { type: 'application/zip' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `stickers-batch-${new Date().getTime()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success(`Downloaded ${boxKeys.length} PDFs as ZIP file`);
    } catch (error) {
        toast.error('Error downloading PDFs');
        console.error('Download error:', error);
        throw error;
    }
};

export const getNewOrdersCount = async (factoryId) => {
    try {
        const response = await axios.get(`${API_URL}/${factoryId}/new-orders-count`);
        return response.data.newOrdersCount;
    } catch (error) {
        console.error('Error fetching new orders count:', error);
        // Don't show toast for this, as it's a background stat
        return 0;
    }
};

export const markFactoryOrdersSeen = async (factoryId) => {
    try {
        await axios.patch(`${API_URL}/${factoryId}/mark-orders-seen`);
        console.log('Factory orders marked as seen');
    } catch (error) {
        console.error('Error marking factory orders as seen:', error);
        // Don't show toast for this, as it's a background action
    }
};
