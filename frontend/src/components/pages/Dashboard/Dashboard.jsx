import { useState, useEffect, useContext } from "react";
import {
  Building,
  ShoppingCart,
  Package,
  Users,
  Truck,
  LayoutDashboard,
  BarChart2,
  Edit,
  User,
  Phone,
  Calendar,
} from "lucide-react";
import { Link } from "react-router-dom";
import axios from "axios";
import OrderItemsPieChart from "./OrderItemsPieChart";
import { motion, AnimatePresence } from "framer-motion";
import TopSoldProducts from "./TopSoldProducts";
import TotalRevenueChart from "./TotalRevenueChart";
import SalesProgress from "./SalesProgress";
import CustomerGrowthChart from "./CustomerGrowthChart";
import DistributorSalesHistogram from "./DistributorSalesHistogram";
import EditSaleModal from "../Dealers/components/EditSaleModal";
import { updateSale } from "../Dealers/services/dealerSalesService";
import { toast } from "react-hot-toast";
import { AuthContext } from "../../../context/AuthContext";
import DashboardSummaryLayout from "../../global/DashboardSummaryLayout";

export default function Dashboard() {
  const { user, isAdmin, hasAnyPrivilege } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [assignedProducts, setAssignedProducts] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [counts, setCounts] = useState({
    factories: 0,
    orders: 0,
    models: 0,
    dealers: 0,
    subDealers: 0,
    distributors: 0,
    sales: 0,
  });
  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    dispatched: 0,
  });

  const fetchAnalyticsData = async () => {
    try {
      const token = localStorage.getItem("token");
      const promises = [];
      
      if (isAdmin || hasAnyPrivilege('sales')) {
        promises.push(axios.get(`${import.meta.env.VITE_API_URL}/api/sales/all`, {
          headers: { Authorization: `Bearer ${token}` },
        }));
      } else {
        promises.push(Promise.resolve({ data: [] }));
      }

      if (isAdmin || (hasAnyPrivilege('sales') && hasAnyPrivilege('distributors'))) {
        promises.push(axios.get(
          `${import.meta.env.VITE_API_URL}/api/sales/assigned-products`,
          { headers: { Authorization: `Bearer ${token}` } },
        ));
      } else {
        promises.push(Promise.resolve({ data: [] }));
      }

      const results = await Promise.all(promises);
      
      if (results[0]) setSales(results[0].data);
      if (results[1]) setAssignedProducts(results[1].data);
    } catch (error) {
      if (error.response?.status !== 403) {
          console.error("Error fetching analytics data:", error);
      }
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const promises = [
          axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/counts`)
        ];
        
        if (isAdmin || hasAnyPrivilege('orders')) {
          promises.push(axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/stats`));
        }

        const [countsResponse, statsResponse] = await Promise.all(promises);
        
        setCounts(prev => ({ ...prev, ...countsResponse.data }));
        
        if (statsResponse) {
          setOrderStats(statsResponse.data);
        }
      } catch (error) {
        if (error.response?.status !== 403) {
            console.error("Error fetching dashboard data:", error);
        }
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === "overview") {
      fetchDashboardData();
    } else if (activeTab === "analytics") {
      fetchAnalyticsData();
    }
  }, [activeTab]);

  const handleEdit = (sale) => {
    setSelectedSale(sale);
    setIsEditModalOpen(true);
  };

  const handleSave = async (updatedData) => {
    if (!selectedSale) return;

    try {
      await updateSale(selectedSale._id, updatedData);
      toast.success("Sale updated successfully");
      setIsEditModalOpen(false);
      setSelectedSale(null);
      fetchAnalyticsData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error updating sale");
    }
  };

  const cardData = [
    {
      title: "Total Factories",
      count: counts.factories,
      icon: <Building className="w-5 h-5" />,
      bg: "#7C3AED",
      path: "/factory-management",
      section: "factories"
    },
    {
      title: "Total Orders",
      count: counts.orders,
      icon: <ShoppingCart className="w-5 h-5" />,
      bg: "#0EA5E9",
      path: "/orders",
      section: "orders"
    },
    {
      title: "Sold Products",
      count: counts.sales,
      icon: <BarChart2 className="w-5 h-5" />,
      bg: "#10B981",
      path: "/sales",
      section: "sales"
    },
    {
      title: "Total Distributors",
      count: counts.distributors,
      icon: <Truck className="w-5 h-5" />,
      bg: "#F59E0B",
      path: "/distributors",
      section: "distributors"
    },
    {
      title: "Total Dealers",
      count: counts.dealers,
      icon: <Users className="w-5 h-5" />,
      bg: "#FB923C",
      path: "/dealers",
      section: "dealers"
    },
    {
      title: "Total Sub Dealers",
      count: counts.subDealers,
      icon: <Users className="w-5 h-5" />,
      bg: "#8B5CF6",
      path: "/sub-dealers",
      section: "dealers"
    },
  ];

  const filteredCardData = cardData.filter(card => isAdmin || hasAnyPrivilege(card.section));

  const TabButton = ({ id, label, icon: Icon, isActive, onClick }) => (
    <motion.button
      onClick={() => onClick(id)}
      className={`flex items-center px-4 py-2 font-medium text-sm rounded-md transition-all duration-300 ease-in-out
                ${isActive ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Icon className="w-4 h-4 mr-2" />
      {label}
    </motion.button>
  );

  return (
    <div className="p-4">
      <div className="p-4 bg-white mt-2 rounded-lg">
        <h1 className="text-xl font-semibold text-gray-800 mb-4">Dashboard</h1>

        <motion.div
          layout
          className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit"
        >
          <TabButton
            id="overview"
            label="Progress Overview"
            icon={LayoutDashboard}
            isActive={activeTab === "overview"}
            onClick={setActiveTab}
          />
          {(isAdmin || hasAnyPrivilege('sales')) && (
            <TabButton
              id="analytics"
              label="Analytics"
              icon={BarChart2}
              isActive={activeTab === "analytics"}
              onClick={setActiveTab}
            />
          )}
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ x: 10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -10, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            {activeTab === "overview" && (
              <div>
                <div className="p-1 bg-white min-h-50 mt-3 rounded-xl">
                  <div className="p-3 sm:p-6">
                    <DashboardSummaryLayout
                      greetingTitle="Welcome back"
                      greetingName={user?.name || user?.username || "Admin"}
                      greetingMessage="Your command center is ready. Review today's operational snapshot across factories, inventory, partners, orders, and sales."
                      cards={filteredCardData}
                      loading={loading}
                    />
                  </div>
                </div>

                {(isAdmin || hasAnyPrivilege('orders')) && (
                  <div className="flex flex-col lg:flex-row gap-4 mt-4">
                    <div className="bg-white w-full rounded-xl p-5">
                      <h1 className="mb-5 font-bold text-lg">
                        Order Items Status
                      </h1>
                      <OrderItemsPieChart />
                    </div>
                  </div>
                )}

                <div className="flex flex-col lg:flex-row gap-4 mt-4"></div>
              </div>
            )}

            {activeTab === "analytics" && (isAdmin || hasAnyPrivilege('sales')) && (
              <div className="p-1">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TopSoldProducts sales={sales} />
                  <SalesProgress sales={sales} />
                  {(isAdmin || hasAnyPrivilege('customers')) && <CustomerGrowthChart sales={sales} />}
                  {(isAdmin || hasAnyPrivilege('distributors')) && (
                    <DistributorSalesHistogram
                      assignedProducts={assignedProducts}
                    />
                  )}
                  {isAdmin && (
                    <div className="lg:col-span-2">
                      <TotalRevenueChart sales={sales} />
                    </div>
                  )}
                </div>

                {/* Sales List Table */}
                <div className="mt-8 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800">Recent Sales</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {["Product Name", "Serial Number", "Customer Name", "Customer Phone", "Customer Email", "Customer Address", "Plumber Name", "Sold At", "Actions"].map((head) => (
                            <th key={head} className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              {head}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sales.slice(0, 10).map((sale) => (
                          <tr key={sale._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sale.product?.productName || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sale.product?.serialNumber || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center h-full">
                              <User className="h-4 w-4 mr-2 text-gray-400" />
                              {sale.customerName || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center">
                                <Phone className="h-4 w-4 mr-2 text-gray-400" />
                                {sale.customerPhone || "-"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sale.customerEmail || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-[150px]">{sale.customerAddress || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sale.plumberName || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                {new Date(sale.soldAt || sale.createdAt).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleEdit(sale)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                <Edit className="h-5 w-5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {sales.length === 0 && (
                          <tr>
                            <td colSpan="9" className="px-6 py-10 text-center text-gray-500">No sales records found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                    <Link
                      to="/sales"
                      className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      View All Sales
                      <Edit className="ml-2 h-4 w-4 rotate-[-90deg]" /> {/* Reusing Edit as a placeholder for an arrow, or better just use text */}
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Edit Sale Modal */}
      {selectedSale && (
        <EditSaleModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          sale={selectedSale}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
