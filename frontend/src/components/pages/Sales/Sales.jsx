import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  Search,
  X,
  Box,
  Building,
  Package,
  Eye,
  Trash2,
  Edit,
} from "lucide-react";
import { getFactories } from "../FactoryManagement/services/factoryService";
import { getModels } from "../Management/services/managementService";
import {
  FilterGroup,
  FilterItem,
  FilterSelector,
} from "../../global/FilterGroup";
import { confirmDelete } from "../../global/deleteConfirm";
import EditSaleModal from "../Dealers/components/EditSaleModal";
import EditProductModal from "../Products/components/EditProductModal";

const API_URL = import.meta.env.VITE_API_URL;
const PRODUCT_API_URL = `${API_URL}/api/products`;

const getSerialCounter = (serialNumber) => {
  if (!serialNumber) return null;
  const match = serialNumber.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
};

const getWarrantyBadgeClass = (status) => {
  if (status === "Active") return "bg-green-100 text-green-800";
  if (status === "Expiring Soon") return "bg-amber-100 text-amber-800";
  if (status === "Expired") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-700";
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
};

const formatWarrantyBalance = (warrantyInfo) => {
  if (!warrantyInfo || warrantyInfo.balanceDays === null || warrantyInfo.balanceDays === undefined) {
    return "-";
  }
  if (warrantyInfo.balanceDays < 0) {
    return `${Math.abs(warrantyInfo.balanceDays)} days overdue`;
  }
  return `${warrantyInfo.balanceDays} days`;
};

const getCustomerDetails = (product) => {
  const sale = product.sale;
  if (!sale) return null;

  return {
    _id: sale.customer?._id || null,
    name: sale.customer?.name || sale.customerName || "-",
    phone: sale.customer?.phone || sale.customerPhone || "-",
    email: sale.customer?.email || sale.customerEmail || "-",
    address: sale.customer?.address || sale.customerAddress || "-",
    state: sale.customer?.state || "-",
    city: sale.customer?.city || "-",
    plumberName: sale.customer?.plumberName || sale.plumberName || "-",
    plumberPhone: sale.customer?.plumberPhone || sale.plumberPhone || "-",
    saleDate: sale.saleDate || sale.soldAt || null,
  };
};

export default function Sales() {
  const [products, setProducts] = useState([]);
  const [models, setModels] = useState([]);
  const [factories, setFactories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [modelFilter, setModelFilter] = useState("all");
  const [factoryFilter, setFactoryFilter] = useState("all");
  const [soldFilter, setSoldFilter] = useState("all");
  const [startSerialNumber, setStartSerialNumber] = useState("");
  const [endSerialNumber, setEndSerialNumber] = useState("");
  const [selectedModelId, setSelectedModelId] = useState(null);
  const [showModelModal, setShowModelModal] = useState(false);
  const [selectedCustomerProduct, setSelectedCustomerProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editProductModalOpen, setEditProductModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [modalCurrentPage, setModalCurrentPage] = useState(1);
  const [modalItemsPerPage, setModalItemsPerPage] = useState(10);
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [modalSoldFilter, setModalSoldFilter] = useState("all");
  const [modalStartSerialNumber, setModalStartSerialNumber] = useState("");
  const [modalEndSerialNumber, setModalEndSerialNumber] = useState("");
  const [appliedModalStartSerialNumber, setAppliedModalStartSerialNumber] =
    useState("");
  const [appliedModalEndSerialNumber, setAppliedModalEndSerialNumber] =
    useState("");

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(PRODUCT_API_URL);
      setProducts(response.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Error fetching sales data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [modelsData, factoriesData] = await Promise.all([
          getModels(),
          getFactories(),
        ]);
        setModels(modelsData || []);
        setFactories(factoriesData || []);
      } catch (error) {
        toast.error("Failed to fetch models or factories");
      }
    };

    fetchInitialData();
    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const startCounter = getSerialCounter(startSerialNumber);
    const endCounter = getSerialCounter(endSerialNumber);

    return products.filter((product) => {
      const matchesSearch =
        !searchTerm ||
        product.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.model?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.factory?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.distributor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.dealer?.name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesModel =
        modelFilter === "all" || product.model?._id === modelFilter;
      const matchesFactory =
        factoryFilter === "all" || product.factory?._id === factoryFilter;
      const matchesSold =
        soldFilter === "all" ||
        (soldFilter === "sold" && product.sold) ||
        (soldFilter === "unsold" && !product.sold);

      const serialCounter = getSerialCounter(product.serialNumber);
      const matchesSerialRange =
        (!startSerialNumber && !endSerialNumber) ||
        (startCounter !== null &&
          endCounter !== null &&
          startCounter <= endCounter &&
          serialCounter !== null &&
          serialCounter >= startCounter &&
          serialCounter <= endCounter);

      return (
        matchesSearch &&
        matchesModel &&
        matchesFactory &&
        matchesSold &&
        matchesSerialRange
      );
    });
  }, [
    products,
    searchTerm,
    modelFilter,
    factoryFilter,
    soldFilter,
    startSerialNumber,
    endSerialNumber,
  ]);

  const modelGroups = useMemo(() => {
    const groupedMap = new Map();

    filteredProducts.forEach((product) => {
      const key = product.model?._id || `unknown-${product.model?.name || "unknown"}`;
      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          modelId: product.model?._id || key,
          modelName: product.model?.name || "Unknown",
          count: 0,
        });
      }
      groupedMap.get(key).count += 1;
    });

    return Array.from(groupedMap.values()).sort((a, b) =>
      a.modelName.localeCompare(b.modelName),
    );
  }, [filteredProducts]);

  const selectedModelProducts = useMemo(() => {
    const startCounter = getSerialCounter(appliedModalStartSerialNumber);
    const endCounter = getSerialCounter(appliedModalEndSerialNumber);

    return filteredProducts
      .filter((product) => product.model?._id === selectedModelId)
      .filter((product) => {
        const matchesSold =
          modalSoldFilter === "all" ||
          (modalSoldFilter === "sold" && product.sold) ||
          (modalSoldFilter === "unsold" && !product.sold);

        const serialCounter = getSerialCounter(product.serialNumber);
        const matchesSerialRange =
          (!appliedModalStartSerialNumber && !appliedModalEndSerialNumber) ||
          (startCounter !== null &&
            endCounter !== null &&
            startCounter <= endCounter &&
            serialCounter !== null &&
            serialCounter >= startCounter &&
            serialCounter <= endCounter);

        return matchesSold && matchesSerialRange;
      })
      .sort((a, b) => {
        const aCounter = getSerialCounter(a.serialNumber) ?? 0;
        const bCounter = getSerialCounter(b.serialNumber) ?? 0;
        return aCounter - bCounter;
      });
  }, [
    filteredProducts,
    selectedModelId,
    modalSoldFilter,
    appliedModalStartSerialNumber,
    appliedModalEndSerialNumber,
  ]);

  const paginatedModelGroups = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return modelGroups.slice(startIndex, startIndex + itemsPerPage);
  }, [modelGroups, currentPage, itemsPerPage]);

  const paginatedModalProducts = useMemo(() => {
    const startIndex = (modalCurrentPage - 1) * modalItemsPerPage;
    return selectedModelProducts.slice(startIndex, startIndex + modalItemsPerPage);
  }, [selectedModelProducts, modalCurrentPage, modalItemsPerPage]);

  const totalPages = Math.ceil(modelGroups.length / itemsPerPage) || 1;
  const modalTotalPages =
    Math.ceil(selectedModelProducts.length / modalItemsPerPage) || 1;

  const openModelModal = (modelId) => {
    setSelectedModelId(modelId);
    setModalSoldFilter("all");
    setModalStartSerialNumber("");
    setModalEndSerialNumber("");
    setAppliedModalStartSerialNumber("");
    setAppliedModalEndSerialNumber("");
    setModalCurrentPage(1);
    setShowModelModal(true);
  };

  const closeModelModal = () => {
    setShowModelModal(false);
    setSelectedModelId(null);
    setModalSoldFilter("all");
    setModalStartSerialNumber("");
    setModalEndSerialNumber("");
    setAppliedModalStartSerialNumber("");
    setAppliedModalEndSerialNumber("");
  };

  const handleModalSerialSearch = () => {
    setAppliedModalStartSerialNumber(modalStartSerialNumber.trim());
    setAppliedModalEndSerialNumber(modalEndSerialNumber.trim());
    setModalCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setModelFilter("all");
    setFactoryFilter("all");
    setSoldFilter("all");
    setStartSerialNumber("");
    setEndSerialNumber("");
    setCurrentPage(1);
  };

  const handleDeleteProduct = async (productId) => {
    const product = products.find((item) => item._id === productId);
    const confirmed = await confirmDelete({
      entityLabel: "product",
      itemName: product?.serialNumber,
    });

    if (!confirmed) return;

    try {
      setDeletingProductId(productId);
      await axios.delete(`${PRODUCT_API_URL}/${productId}`);
      toast.success("Product deleted successfully");
      await fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error deleting product");
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleSaleSave = async (updatedData) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/sales/${selectedCustomerProduct.sale._id}`, updatedData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Sale details updated successfully');
      fetchProducts();
      setSelectedCustomerProduct(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update sale');
    }
  };

  const handleProductUpdate = () => {
    fetchProducts();
  };

  const selectedModelName =
    modelGroups.find((group) => group.modelId === selectedModelId)?.modelName ||
    models.find((model) => model._id === selectedModelId)?.name ||
    "Products";

  const selectedCustomerDetails = selectedCustomerProduct
    ? getCustomerDetails(selectedCustomerProduct)
    : null;

  return (
    <div className="p-4 lg:p-4 min-h-full">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 lg:p-6 border-b border-gray-200">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Sales</h2>
              <p className="text-sm text-gray-600">
                Total Products: {filteredProducts.length}
              </p>
            </div>

            <FilterGroup>
              <FilterItem>
                <div className="relative min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 bg-gray-50 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
                  />
                </div>
              </FilterItem>
              <FilterItem>
                <FilterSelector
                  value={modelFilter}
                  onChange={(value) => {
                    setModelFilter(value);
                    setCurrentPage(1);
                  }}
                  options={models}
                  placeholder="All Models"
                  icon={Box}
                />
              </FilterItem>
              <FilterItem>
                <FilterSelector
                  value={factoryFilter}
                  onChange={(value) => {
                    setFactoryFilter(value);
                    setCurrentPage(1);
                  }}
                  options={factories}
                  placeholder="All Factories"
                  icon={Building}
                />
              </FilterItem>
              <FilterItem>
                <div className="relative w-full sm:w-40">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    value={soldFilter}
                    onChange={(e) => {
                      setSoldFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 bg-gray-50 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm appearance-none"
                  >
                    <option value="all">All Status</option>
                    <option value="sold">Sold</option>
                    <option value="unsold">Unsold</option>
                  </select>
                </div>
              </FilterItem>
              <FilterItem>
                <input
                  type="text"
                  placeholder="Start serial"
                  value={startSerialNumber}
                  onChange={(e) => {
                    setStartSerialNumber(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full sm:w-40 px-4 py-2.5 border border-gray-200 bg-gray-50 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
                />
              </FilterItem>
              <FilterItem>
                <input
                  type="text"
                  placeholder="End serial"
                  value={endSerialNumber}
                  onChange={(e) => {
                    setEndSerialNumber(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full sm:w-40 px-4 py-2.5 border border-gray-200 bg-gray-50 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
                />
              </FilterItem>
              <FilterItem>
                <button
                  onClick={clearFilters}
                  className="flex items-center justify-center bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                >
                  Clear Filters
                </button>
              </FilterItem>
            </FilterGroup>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4d55f5] mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading sales...</p>
          </div>
        ) : modelGroups.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No products found.
          </div>
        ) : (
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Model
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Products
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedModelGroups.map((group) => (
                    <tr key={group.modelId} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {group.modelName}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <button
                          onClick={() => openModelModal(group.modelId)}
                          className="inline-flex items-center px-3 py-1.5 border border-[#4d55f5] text-xs font-medium rounded text-[#4d55f5] hover:bg-[#4d55f5] hover:text-white transition-colors"
                        >
                          <Box className="h-4 w-4 mr-1" />
                          {group.count} Products
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-sm text-gray-700">
                Rows per page:
                <select
                  className="ml-2 border border-gray-300 rounded px-2 py-1"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="25">25</option>
                </select>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span>
                  Showing{" "}
                  {modelGroups.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}{" "}
                  to {Math.min(currentPage * itemsPerPage, modelGroups.length)} of{" "}
                  {modelGroups.length} models
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showModelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className={`absolute inset-0 transition-colors ${
              selectedCustomerProduct ? "bg-black/10" : "bg-black/40"
            }`}
            onClick={selectedCustomerProduct ? undefined : closeModelModal}
          ></div>
          <div className="relative z-10 bg-white rounded-lg shadow-lg w-full max-w-7xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedModelName}
                </h3>
                <p className="text-sm text-gray-500">
                  Total Products: {selectedModelProducts.length}
                </p>
              </div>
              <button
                onClick={closeModelModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    Sort Products
                  </h4>
                  <p className="text-xs text-gray-500">
                    Filter by sold status or inclusive serial number range.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative w-full sm:w-40">
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select
                      value={modalSoldFilter}
                      onChange={(e) => {
                        setModalSoldFilter(e.target.value);
                        setModalCurrentPage(1);
                      }}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 bg-white rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm appearance-none"
                    >
                      <option value="all">All</option>
                      <option value="sold">Sold</option>
                      <option value="unsold">Unsold</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    placeholder="Start serial"
                    value={modalStartSerialNumber}
                    onChange={(e) => {
                      setModalStartSerialNumber(e.target.value);
                    }}
                    className="w-full sm:w-40 px-4 py-2.5 border border-gray-200 bg-white rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
                  />
                  <input
                    type="text"
                    placeholder="End serial"
                    value={modalEndSerialNumber}
                    onChange={(e) => {
                      setModalEndSerialNumber(e.target.value);
                    }}
                    className="w-full sm:w-40 px-4 py-2.5 border border-gray-200 bg-white rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleModalSerialSearch}
                    className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Model
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Serial Number
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Distributor
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Assigned Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Dealer
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Factory
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Warranty Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Warranty Balance
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Sold To
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedModalProducts.map((product) => {
                      const customerDetails = getCustomerDetails(product);
                      return (
                        <tr key={product._id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {product.model?.name || "-"}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {product.serialNumber}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {product.distributor?.name || "-"}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(product.assignedToDistributorAt)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {product.dealer?.name || "-"}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {product.factory?.name || "-"}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${getWarrantyBadgeClass(
                                product.warrantyInfo?.status,
                              )}`}
                            >
                              {product.warrantyInfo?.status || "-"}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatWarrantyBalance(product.warrantyInfo)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {customerDetails ? (
                              <button
                                onClick={() => setSelectedCustomerProduct(product)}
                                className="inline-flex items-center px-2.5 py-1.5 border border-blue-200 text-xs font-medium rounded text-blue-700 hover:bg-blue-50 transition-colors"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </button>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingProduct(product);
                                  setEditProductModalOpen(true);
                                }}
                                className="inline-flex items-center px-2.5 py-1.5 border border-blue-200 text-xs font-medium rounded text-blue-700 hover:bg-blue-50 transition-colors"
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product._id)}
                                disabled={deletingProductId === product._id}
                                className="inline-flex items-center px-2.5 py-1.5 border border-red-200 text-xs font-medium rounded text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-sm text-gray-700">
                Rows per page:
                <select
                  className="ml-2 border border-gray-300 rounded px-2 py-1"
                  value={modalItemsPerPage}
                  onChange={(e) => {
                    setModalItemsPerPage(Number(e.target.value));
                    setModalCurrentPage(1);
                  }}
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span>
                  Showing{" "}
                  {selectedModelProducts.length > 0
                    ? (modalCurrentPage - 1) * modalItemsPerPage + 1
                    : 0}{" "}
                  to{" "}
                  {Math.min(
                    modalCurrentPage * modalItemsPerPage,
                    selectedModelProducts.length,
                  )}{" "}
                  of {selectedModelProducts.length} products
                </span>
                <button
                  onClick={() =>
                    setModalCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={modalCurrentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span>
                  Page {modalCurrentPage} of {modalTotalPages}
                </span>
                <button
                  onClick={() =>
                    setModalCurrentPage((prev) =>
                      Math.min(modalTotalPages, prev + 1),
                    )
                  }
                  disabled={modalCurrentPage === modalTotalPages}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <EditSaleModal
        isOpen={!!selectedCustomerProduct}
        onClose={() => setSelectedCustomerProduct(null)}
        sale={selectedCustomerProduct?.sale || {}}
        onSave={handleSaleSave}
        initialMode="view"
        backdropClassName="bg-transparent"
      />

      <EditProductModal
        isOpen={editProductModalOpen}
        onClose={() => setEditProductModalOpen(false)}
        product={editingProduct}
        onUpdate={handleProductUpdate}
      />
    </div>
  );
}
