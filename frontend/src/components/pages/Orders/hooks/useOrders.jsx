import { useState, useEffect, useCallback } from 'react';
import { orderService } from '../services/orderServices';
import { toast } from 'react-hot-toast';

export const useOrders = () => {
  const [orders, setOrders] = useState([]);
  const [factories, setFactories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [statusTabs, setStatusTabs] = useState([
    { key: 'all', label: 'All', count: 0 },
    { key: 'pending', label: 'Pending', count: 0 },
    { key: 'completed', label: 'Completed', count: 0 }
  ]);

  const updateStatusTabCounts = useCallback((ordersList) => {
    const counts = ordersList.reduce(
      (acc, order) => {
        if (order.status === 'Pending') acc.pending++;
        else if (order.status === 'Completed') acc.completed++;
        acc.all++;
        return acc;
      },
      { all: 0, pending: 0, completed: 0 }
    );

    setStatusTabs(prevTabs =>
      prevTabs.map(tab => ({
        ...tab,
        count: counts[tab.key]
      }))
    );
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [ordersRes, factoriesRes, categoriesRes, modelsRes] = await Promise.all([
        orderService.fetchOrders(),
        orderService.fetchFactories(),
        orderService.fetchCategories(),
        orderService.fetchModels()
      ]);

      // Sort orders by createdAt in descending order
      const sortedOrders = ordersRes.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setOrders(sortedOrders);
      updateStatusTabCounts(ordersRes.data);
      setFactories(Array.isArray(factoriesRes.data) ? factoriesRes.data : []);
      setCategories(categoriesRes.data.filter(cat => cat.status === 'Active'));
      setModels(modelsRes.data.filter(model => model.status === 'Active'));
    } catch (error) {
      toast.error('Error fetching data');
      console.error('Error fetching data:', error);
      setFactories([]);
      setCategories([]);
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, [updateStatusTabCounts]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addOrder = async (orderData, retryCount = 0) => {
    setIsAdding(true);
    try {
      const { data } = await orderService.createOrder(orderData);
      setOrders([data, ...orders]);
      updateStatusTabCounts([data, ...orders]);
      toast.success('Order added successfully');
      return true;
    } catch (error) {
      // Handle duplicate key errors with retry logic
      if (error.response?.data?.error === 'DUPLICATE_KEY_ERROR' && retryCount < 3) {
        toast.warning(`Duplicate detected, retrying... (${retryCount + 1}/3)`);
        // Wait a short time before retrying
        await new Promise(resolve => setTimeout(resolve, 500 + (retryCount * 200)));
        return addOrder(orderData, retryCount + 1);
      }
      
      const errorMessage = error.response?.data?.error === 'DUPLICATE_KEY_ERROR' 
        ? 'Unable to create order due to duplicate serial numbers. Please try again later.'
        : error.response?.data?.message || 'Error adding order';
      
      toast.error(errorMessage);
      console.error('Error adding order:', error);
      return false;
    } finally {
      setIsAdding(false);
    }
  };

  const updateOrder = async (id, orderData, retryCount = 0) => {
    try {
      const { data } = await orderService.updateOrder(id, orderData);
      const updatedOrders = orders.map(order => order._id === id ? data : order);
      setOrders(updatedOrders);
      updateStatusTabCounts(updatedOrders);
      toast.success('Order updated successfully');
      return true;
    } catch (error) {
      // Handle duplicate key errors with retry logic
      if (error.response?.data?.error === 'DUPLICATE_KEY_ERROR' && retryCount < 3) {
        toast.warning(`Duplicate detected, retrying... (${retryCount + 1}/3)`);
        // Wait a short time before retrying
        await new Promise(resolve => setTimeout(resolve, 500 + (retryCount * 200)));
        return updateOrder(id, orderData, retryCount + 1);
      }
      
      const errorMessage = error.response?.data?.error === 'DUPLICATE_KEY_ERROR' 
        ? 'Unable to update order due to duplicate serial numbers. Please try again later.'
        : error.response?.data?.message || 'Error updating order';
      
      toast.error(errorMessage);
      console.error('Error updating order:', error);
      return false;
    }
  };

  const deleteOrder = async (id) => {
    try {
      await orderService.deleteOrder(id);
      const updatedOrders = orders.filter(order => order._id !== id);
      setOrders(updatedOrders);
      updateStatusTabCounts(updatedOrders);
      toast.success('Order deleted successfully');
      return true;
    } catch (error) {
      toast.error('Error deleting order');
      console.error('Error deleting order:', error);
      return false;
    }
  };

  const deleteMultipleOrders = async (ids) => {
    try {
      await orderService.deleteMultipleOrders(ids);
      const updatedOrders = orders.filter(order => !ids.includes(order._id));
      setOrders(updatedOrders);
      updateStatusTabCounts(updatedOrders);
      toast.success('Selected orders deleted successfully');
      return true;
    } catch (error) {
      toast.error('Error deleting selected orders');
      console.error('Error deleting selected orders:', error);
      return false;
    }
  };

  const updateOrderStatus = async (id, status) => {
    try {
      const { data } = await orderService.updateOrderStatus(id, status);
      const updatedOrders = orders.map(order => order._id === id ? data : order);
      setOrders(updatedOrders);
      updateStatusTabCounts(updatedOrders);
      toast.success(`Order status updated to ${status}`);
      return true;
    } catch (error) {
      toast.error('Error updating order status');
      console.error('Error updating order status:', error);
      return false;
    }
  };

  const markOrderAsDispatched = async (id) => {
    try {
      const { data } = await orderService.markOrderAsDispatched(id);
      const updatedOrders = orders.map(order => order._id === id ? data : order);
      setOrders(updatedOrders);
      updateStatusTabCounts(updatedOrders);
      toast.success('Order marked as dispatched');
      return true;
    } catch (error) {
      toast.error('Error marking order as dispatched');
      console.error('Error marking order as dispatched:', error);
      return false;
    }
  };

  const bulkUpdateOrderStatus = async (itemIds, status) => {
    try {
      const { data } = await orderService.bulkUpdateOrderStatus(itemIds, status);
      const updatedOrders = orders.map(order => {
        const updatedItem = data.find(item => item._id === order._id);
        return updatedItem || order;
      });
      setOrders(updatedOrders);
      updateStatusTabCounts(updatedOrders);
      toast.success(`Order status updated to ${status}`);
      return true;
    } catch (error) {
      toast.error('Error updating order status');
      console.error('Error updating order status:', error);
      return false;
    }
  };

  return {
    orders,
    factories,
    categories,
    models,
    loading,
    statusTabs,
    addOrder,
    updateOrder,
    deleteOrder,
    updateOrderStatus,
    markOrderAsDispatched,
    bulkUpdateOrderStatus,
    refreshOrders: fetchData,
    isAdding
  };
};
