import { useState } from 'react';
import { toast } from 'react-hot-toast';
import ErrorBoundary from '../../global/ErrorBoundary';
import ConfirmationModal from '../../global/ConfirmationModal';
import { confirmDelete } from '../../global/deleteConfirm';
import { useOrders } from './hooks/useOrders';
import { useOrderForm } from './hooks/useOrderForm';
import { OrderFilters } from './components/orderFilters';
import { OrderTable } from './components/orderTable';
import { OrderCard } from './components/orderCard';
import { OrderModal } from './components/orderModal';
import { OrderDetailsModal } from './components/orderDetailsModal';
import { LoadingSpinner } from './components/LoadingSpinner';
import { orderService } from './services/orderServices';
import { Trash2 } from 'lucide-react';
import ExportToExcelButton from '../../global/ExportToExcelButton';
import ExportToPdfButton from '../../global/ExportToPdfButton';

function Orders() {

  const [searchTerm, setSearchTerm] = useState('');
  const [factoryFilter, setFactoryFilter] = useState('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');
  const [dispatchedFilter, setDispatchedFilter] = useState('all');
  const [modelFilter, setModelFilter] = useState('all');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Default to 10 items per page
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFirstConfirmationModal, setShowFirstConfirmationModal] = useState(false);
  const [showSecondConfirmationModal, setShowSecondConfirmationModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);

  const [isEdit, setIsEdit] = useState(false);
  const [factoryStats, setFactoryStats] = useState({});
  const [orderItems, setOrderItems] = useState([]);
  const [modalTab, setModalTab] = useState('summary');

  const clearFilters = () => {
    setSearchTerm('');
    setFactoryFilter('all');
    setOrderTypeFilter('all');
    setDispatchedFilter('all');
    setModelFilter('all');
    setStartDate('');
    setEndDate('');
  };

  const {
    orders,
    factories,
    categories,
    models,
    loading,
    addOrder,
    updateOrder,
    deleteOrder,
    deleteMultipleOrders,
    updateOrderStatus,
    refreshOrders,
    isAdding
  } = useOrders();

  const orderColumns = [
    { header: 'Order ID', accessor: 'Order ID' },
    { header: 'Serial Number', accessor: 'Serial Number' },
    { header: 'Factory', accessor: 'Factory' },
    { header: 'Model', accessor: 'Model' },
    { header: 'Boxes', accessor: 'Boxes' },
    { header: 'Total Units', accessor: 'Total Units' },
    { header: 'Dispatched Units', accessor: 'Dispatched Units' },
    { header: 'Created At', accessor: 'Created At' },
  ];

  const getExportData = () => {
    return filteredOrders.map(order => {
      const getTotalUnits = (ord) => {
        return ord.totalUnits || 
               (ord.quantity * (ord.orderType === '2_units' ? 2 : 
                                 ord.orderType === '3_units' ? 3 : 1));
      };
      return {
        'Order ID': order.orderId,
        'Serial Number': order.serialNumber,
        'Factory': order.factory?.name,
        'Model': order.model?.name,
        'Boxes': order.quantity,
        'Total Units': getTotalUnits(order),
        'Dispatched Units': order.dispatchedUnits || 0,
        'Created At': new Date(order.createdAt).toLocaleDateString(),
      }
    });
  };

  const handleDeleteClick = (order) => {
    setOrderToDelete(order);
    setShowFirstConfirmationModal(true);
  };

  const handleConfirmFirstDelete = () => {
    setShowFirstConfirmationModal(false);
    setShowSecondConfirmationModal(true);
  };

  const handleConfirmPermanentDelete = async () => {
    if (orderToDelete) {
      await deleteOrder(orderToDelete._id);
      setOrderToDelete(null);
      setShowSecondConfirmationModal(false);
    }
  };

  const handleCancelDelete = () => {
    setOrderToDelete(null);
    setShowFirstConfirmationModal(false);
    setShowSecondConfirmationModal(false);
  };

  const {
    formData,
    filteredModels,
    selectedModelDetails,
    updateField,
    updateOrderType,
    updateTotalPumps,
    resetForm,
    validateForm,
    getSubmitData
  } = useOrderForm(isEdit, selectedOrder, models);

  const filteredOrders = orders.filter(order => {

    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    const matchesSearch = (order.productName && order.productName.toLowerCase().includes(lowerCaseSearchTerm)) ||
                         (order.factory && order.factory.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
                         (order.orderId && order.orderId.toLowerCase().includes(lowerCaseSearchTerm)) ||
                         (order.serialNumber && order.serialNumber.toLowerCase().includes(lowerCaseSearchTerm)) ||
                         (order.model && order.model.name.toLowerCase().includes(lowerCaseSearchTerm));

    const matchesFactory = factoryFilter === 'all' || order.factory?._id === factoryFilter;
    const matchesOrderType = orderTypeFilter === 'all' || order.orderType === orderTypeFilter;
    const matchesDispatched = dispatchedFilter === 'all' || String(order.dispatched) === dispatchedFilter;
    const matchesModel = modelFilter === 'all' || order.model?._id === modelFilter;

    const orderDate = new Date(order.createdAt);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const matchesDate = (!start || orderDate >= start) && (!end || orderDate <= end);

    return matchesSearch && matchesFactory && matchesOrderType && matchesDispatched && matchesModel && matchesDate;
  });

  // Apply pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const handleAddOrder = async (e) => {
    e.preventDefault();

    const validation = validateForm();
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    const submitData = getSubmitData();

    if (isEdit) {
      const success = await updateOrder(selectedOrder._id, submitData);
      if (success) {
        resetFormState();
      }
    } else {
      const success = await addOrder(submitData);
      if (success) {
        resetFormState();
      }
    }
  };

  const resetFormState = () => {
    setShowOrderModal(false);
    setIsEdit(false);
    setSelectedOrder(null);
    resetForm();
  };

  const handleEditOrder = (order) => {
    if (factories.length === 0) {
      toast.error('Please wait for factories to load');
      return;
    }
    setIsEdit(true);
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const handleViewOrder = async (order) => {
    setSelectedOrder(order);
    setShowOrderDetailsModal(true);
    setModalTab('summary');

    try {
      const [statsRes, itemsRes] = await Promise.all([
        orderService.fetchOrderStats(order._id),
        orderService.fetchOrderItems(order._id)
      ]);
      setFactoryStats(statsRes.data);
      console.log(statsRes.data);
      setOrderItems(itemsRes.data);
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error('Error fetching order details');
      setFactoryStats({});
      setOrderItems([]);
    }
  };

  const handleDispatchOrder = async (id) => {
    try {
      const success = await orderService.markOrderAsDispatched(id);
      if (success) {
        await refreshOrders();
        handleViewOrder(selectedOrder);
        toast.success('Order marked as dispatched');
      }
    } catch (error) {
      console.error('Error dispatching order:', error);
      toast.error('Failed to mark order as dispatched');
    }
  };

  const handleAddOrderClick = () => {
    if (factories.length === 0) {
      toast.error('Please wait for factories to load');
      return;
    }
    setIsEdit(false);
    setSelectedOrder(null);
    resetForm();
    setShowOrderModal(true);
  };

  const handleCloseOrderModal = () => {
    setShowOrderModal(false);
    setIsEdit(false);
    setSelectedOrder(null);
    resetForm();
  };

  const handleCloseDetailsModal = () => {
    setShowOrderDetailsModal(false);
    setFactoryStats({});
    setOrderItems([]);
  };

  const handleSelect = (id) => {
    setSelectedOrders(prev =>
        prev.includes(id) ? prev.filter(orderId => orderId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e) => {
      try {
          if (e.target.checked) {
              const validIds = currentItems
                  .filter(o => o && o._id)
                  .map(o => o._id);
              setSelectedOrders(validIds);
          } else {
              setSelectedOrders([]);
          }
      } catch (error) {
          console.error('Error in select all:', error);
          toast.error('Error selecting orders');
      }
  };

  const handleDeleteSelected = async () => {
      if (!selectedOrders.length) return;

      const confirmed = await confirmDelete({
          entityLabel: 'order',
          entityLabelPlural: 'orders',
          count: selectedOrders.length,
      });

      if (!confirmed) return;
      
      try {
          await deleteMultipleOrders(selectedOrders);
          setSelectedOrders([]);
          toast.success('Selected orders deleted successfully');
      } catch (error) {
          console.error('Error deleting orders:', error);
          toast.error('Failed to delete selected orders');
      }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      );
    }

    return currentItems.length > 0 ? (
      <>
        <OrderTable
          orders={currentItems}
          onView={handleViewOrder}
          onEdit={handleEditOrder}
          onDelete={handleDeleteClick}
          onStatusChange={updateOrderStatus}
          selectedOrders={selectedOrders}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
        />
        <OrderCard
          orders={currentItems}
          onView={handleViewOrder}
          onEdit={handleEditOrder}
          onDelete={handleDeleteClick}
          onStatusChange={updateOrderStatus}
          selectedOrders={selectedOrders}
          onSelect={handleSelect}
        />
      </>
    ) : (
      <div className="text-center py-12">
        <p className="text-gray-500 text-sm">No orders found</p>
        <button
          onClick={handleAddOrderClick}
          className="mt-4 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#4d55f5] hover:bg-[#3d45e5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4d55f5]"
        >
          Add New Order
        </button>
      </div>
    );
  };

  return (
    <div className="p-2 sm:p-6 space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}


        {/* Filters and Actions */}
        <div className="p-3 sm:p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className='flex flex-col'>
              <h2 className="text-lg font-semibold text-gray-900">Orders</h2>
              <p className="text-sm text-gray-600">Total {filteredOrders.length}</p>
              <div className="flex items-center space-x-2 whitespace-nowrap mt-15">
                  <ExportToExcelButton getData={getExportData} filename="orders-export" />
                  <ExportToPdfButton getData={getExportData} columns={orderColumns} filename="orders-export" />
            </div>
            </div>
            
            <div className="space-y-3 sm:space-y-0 flex flex-col sm:flex-row items-stretch sm:items-center sm:space-x-4">
              {selectedOrders.length > 0 ? (
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center justify-center space-x-2 bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete ({selectedOrders.length})</span>
                </button>
              ) : (
                <OrderFilters
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  factoryFilter={factoryFilter}
                  onFactoryFilterChange={setFactoryFilter}
                  orderTypeFilter={orderTypeFilter}
                  onOrderTypeFilterChange={setOrderTypeFilter}
                  dispatchedFilter={dispatchedFilter}
                  onDispatchedFilterChange={setDispatchedFilter}
                  modelFilter={modelFilter}
                  onModelFilterChange={setModelFilter}
                  startDate={startDate}
                  onStartDateChange={setStartDate}
                  endDate={endDate}
                  onEndDateChange={setEndDate}
                  factories={factories}
                  models={models}
                  onAddOrder={handleAddOrderClick}
                  onClearFilters={clearFilters}
                />
              )}

            </div>
          </div>
        </div>

        {/* Table and Cards */}
        <div className="relative min-h-[200px]">
          {renderContent()}
        </div>

        {/* Pagination */}
        <div className="p-3 sm:px-6 sm:py-3 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
          <div className="text-sm text-gray-700 w-full sm:w-auto flex items-center space-x-2">
            <span>Rows per page:</span>
            <select
              className="border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setSelectedOrders([]);
                setCurrentPage(1);
              }}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="75">75</option>
              <option value="100">100</option>
            </select>
          </div> 
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <span className="text-sm text-gray-700 hidden sm:inline">
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredOrders.length)} of {filteredOrders.length} orders
            </span>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors min-w-[100px] flex items-center justify-center"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700 flex-shrink-0">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors min-w-[100px] flex items-center justify-center"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <OrderModal
        isOpen={showOrderModal}
        isEdit={isEdit}
        formData={formData}
        filteredModels={filteredModels}
        selectedModelDetails={selectedModelDetails}
        categories={categories}
        factories={factories}
        onUpdateField={updateField}
        onUpdateOrderType={updateOrderType}
        onUpdateTotalPumps={updateTotalPumps}
        onSubmit={handleAddOrder}
        onClose={handleCloseOrderModal}
        isAdding={isAdding}
      />

      <OrderDetailsModal
        isOpen={showOrderDetailsModal}
        order={selectedOrder}
        factoryStats={factoryStats}
        orderItems={orderItems}
        modalTab={modalTab}
        onTabChange={setModalTab}
        onClose={handleCloseDetailsModal}
        onDispatch={() => handleDispatchOrder(selectedOrder._id)}
        onStatusChange={async (itemIds, status) => {
          await orderService.bulkUpdateOrderStatus(selectedOrder.factory._id, itemIds, status);
          const itemsRes = await orderService.fetchOrderItems(selectedOrder._id);
          setOrderItems(itemsRes.data);
        }}
      />

      <ConfirmationModal
        isOpen={showFirstConfirmationModal}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmFirstDelete}
        title="Confirm Deletion"
        message="Are you sure you want to delete this order? This action will also delete all associated order items."
        confirmButtonText="Continue to Permanent Delete"
        details={orderToDelete ? { 'Order ID': orderToDelete.orderId, 'Serial Number': orderToDelete.serialNumber, 'Factory': orderToDelete.factory?.name } : null}
      />

      <ConfirmationModal
        isOpen={showSecondConfirmationModal}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmPermanentDelete}
        title="Permanent Deletion Warning"
        message="This is a permanent deletion. All order data and associated items will be irrevocably removed from the system. Are you absolutely sure?"
        confirmButtonText="Delete Permanently"
        confirmButtonClass="bg-red-700 hover:bg-red-800"
        details={orderToDelete ? { 'Order ID': orderToDelete.orderId, 'Serial Number': orderToDelete.serialNumber, 'Factory': orderToDelete.factory?.name } : null}
      />
    </div>
  );
}

export default function OrdersWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <Orders />
    </ErrorBoundary>
  );
}
