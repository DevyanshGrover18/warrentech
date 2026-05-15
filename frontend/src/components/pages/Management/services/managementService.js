import axios from 'axios';
import { toast } from 'react-hot-toast';
import { confirmDelete } from '../../../global/deleteConfirm';

const CATEGORIES_API_URL = `${import.meta.env.VITE_API_URL}/api/categories`;
const MODELS_API_URL = `${import.meta.env.VITE_API_URL}/api/models`;

// Category services
export const getCategories = async () => {
    try {
        const response = await axios.get(CATEGORIES_API_URL);
        return response.data;
    } catch (error) {
        toast.error('Error fetching categories');
        throw error;
    }
};

export const addCategory = async (categoryData) => {
    try {
        const response = await axios.post(CATEGORIES_API_URL, categoryData);
        toast.success('Category added successfully');
        return response.data;
    } catch (error) {
        toast.error('Error adding category');
        throw error;
    }
};

export const updateCategory = async (categoryId, categoryData) => {
    try {
        const response = await axios.put(`${CATEGORIES_API_URL}/${categoryId}`, categoryData);
        toast.success('Category updated successfully');
        return response.data;
    } catch (error) {
        toast.error('Error updating category');
        throw error;
    }
};

export const deleteCategory = async (categoryId) => {
    const confirmed = await confirmDelete({ entityLabel: 'category' });
    if (!confirmed) return false;

    try {
        await axios.delete(`${CATEGORIES_API_URL}/${categoryId}`);
        toast.success('Category deleted successfully');
        return true;
    } catch (error) {
        toast.error('Error deleting category');
        throw error;
    }
};

export const deleteMultipleCategories = async (categoryIds) => {
    const confirmed = await confirmDelete({
        entityLabel: 'category',
        entityLabelPlural: 'categories',
        count: categoryIds.length,
    });
    if (!confirmed) return false;

    try {
        await axios.delete(CATEGORIES_API_URL, { data: { categoryIds } });
        toast.success('Selected categories deleted successfully');
        return true;
    } catch (error) {
        toast.error('Error deleting selected categories');
        throw error;
    }
};

export const updateCategoryStatus = async (categoryId, status) => {
    try {
        await axios.patch(`${CATEGORIES_API_URL}/${categoryId}/status`, { status });
        toast.success('Category status updated successfully');
    } catch (error) {
        toast.error('Error updating category status');
        throw error;
    }
};

// Model services
export const getModels = async () => {
    try {
        const response = await axios.get(MODELS_API_URL);
        return response.data;
    } catch (error) {
        toast.error('Error fetching models');
        throw error;
    }
};

export const addModel = async (modelData) => {
    try {
        const response = await axios.post(MODELS_API_URL, modelData);
        toast.success('Model added successfully');
        return response.data;
    } catch (error) {
        toast.error('Error adding model');
        throw error;
    }
};

export const updateModel = async (modelId, modelData) => {
    try {
        const response = await axios.put(`${MODELS_API_URL}/${modelId}`, modelData);
        toast.success('Model updated successfully');
        return response.data;
    } catch (error) {
        toast.error('Error updating model');
        throw error;
    }
};

export const deleteModel = async (modelId) => {
    const confirmed = await confirmDelete({ entityLabel: 'model' });
    if (!confirmed) return false;

    try {
        await axios.delete(`${MODELS_API_URL}/${modelId}`);
        toast.success('Model deleted successfully');
        return true;
    } catch (error) {
        toast.error('Error deleting model');
        throw error;
    }
};

export const deleteMultipleModels = async (modelIds) => {
    const confirmed = await confirmDelete({
        entityLabel: 'model',
        entityLabelPlural: 'models',
        count: modelIds.length,
    });
    if (!confirmed) return false;

    try {
        await axios.delete(MODELS_API_URL, { data: { ids: modelIds } });
        toast.success('Selected models deleted successfully');
        return true;
    } catch (error) {
        toast.error('Error deleting selected models');
        throw error;
    }
};

export const updateModelStatus = async (modelId, status) => {
    try {
        await axios.patch(`${MODELS_API_URL}/${modelId}/status`, { status });
        toast.success('Model status updated successfully');
    } catch (error) {
        toast.error('Error updating model status');
        throw error;
    }
};

export const getModelsByCategory = async (categoryId) => {
    try {
        const response = await axios.get(`${MODELS_API_URL}/category/${categoryId}`);
        return response.data;
    } catch (error) {
        toast.error('Error fetching models for this category');
        throw error;
    }
};
