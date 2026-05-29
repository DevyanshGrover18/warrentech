import "./App.css";
import { useContext, useState } from "react";
import { Toaster } from "react-hot-toast";
import Dashboard from "./components/pages/Dashboard/Dashboard";
import Management from "./components/pages/Management/Management";
import FactoryManagement from "./components/pages/FactoryManagement/FactoryManagement";
import FactoryOrders from "./components/pages/factoryPanel/factoryorder";
import FactorySales from "./components/pages/factoryPanel/FactorySales";
import FactoryDashboard from "./components/pages/factoryPanel/FactoryDashboard";
import DistributorDashboard from "./components/pages/distributorPanel/DistributorDashboard";
import CustomerLayout from "./components/global/CustomerLayout";
import DistributorProducts from "./components/pages/distributorPanel/DistributorProducts";
import DistributorDealers from "./components/pages/distributorPanel/DistributorDealers";
import DistributorDealerSales from "./components/pages/distributorPanel/DistributorDealerSales";
import DistributorCustomerSales from "./components/pages/distributorPanel/DistributorCustomerSales";
import DealerLayout from "./components/global/DealerLayout";
import DealerDashboard from "./components/pages/dealerPanel/DealerDashboard";
import DealerProducts from "./components/pages/dealerPanel/DealerProducts";
import DealerSales from "./components/pages/dealerPanel/DealerSales";
import SubDealers from "./components/pages/SubDealers/SubDealers";
import AdminCustomers from "../src/components/pages/customer/components/AdminCustomers.jsx";
import Orders from "./components/pages/Orders/Orders";
import Products from "./components/pages/Products/Products";
import ErrorBoundary from "./components/global/ErrorBoundary";
import Distributors from "./components/pages/Distributors/Distributors";
import Dealers from "./components/pages/Dealers/Dealers";
import Sales from "./components/pages/Sales/Sales";
import Login from "./components/auth/Login";
import Notifications from "./components/pages/notifications/Notifications";
import AddMembers from "./components/pages/AddMembers/index";
import Unauthorized from "./components/pages/AddMembers/Unauthorized";
import ProtectedSection from "./components/auth/ProtectedSection";
import ProductDetails from "./components/pages/customer/components/ProductDetails.jsx";
import Technician from "./components/pages/Technician/Technician";
import TechnicianDashboard from "./components/pages/Technician/TechnicianDashboard";
import TechnicianLayout from "./components/global/TechnicianLayout";
import TechnicianRequests from "./components/pages/Technician/TechnicianRequests";
import Replacement from "./components/pages/Replacement/Replacement";
import { SideBar } from "./components/sideBar/sideBar";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { AuthContext } from "./context/AuthContext";
import FactoryLayout from "./components/global/FactoryLayout";
import DistributorLayout from "./components/global/DistributorLayout";
import ExecutiveLayout from "./components/global/ExecutiveLayout";
import SubDealerLayout from "./components/global/SubDealerLayout";
import CustomerPurchases from "./components/pages/customer/CustomerPurchases.jsx";
import CustomerDashboard from "./components/pages/customer/CustomerDashboard";
import CustomerRequests from "./components/pages/customer/CustomerRequests";
import ExecutiveDashboard from "./components/pages/Executive/Dashboard.jsx";
import ExecutiveInventory from "./components/pages/Executive/Inventory.jsx";
import ExecutiveDistributors from "./components/pages/Executive/Distributors.jsx";
import ExecutiveDealers from "./components/pages/Executive/Dealers.jsx";
import ExecutiveCustomers from "./components/pages/Executive/Customers.jsx";
import Executives from "./components/pages/Management/Executives.jsx";
import Incentives from "./components/pages/Incentives/Incentives.jsx";
import AllIncentives from "./components/pages/Incentives/AllIncentives.jsx";
import Wallets from "./components/pages/Wallets/Wallets.jsx";
import AllWalletActivity from "./components/pages/Wallets/AllWalletActivity.jsx";
import MyWallet from "./components/pages/Wallets/MyWallet.jsx";

const SubDealerProtectedRoute = ({ children }) => {
  const { isSubDealerAuthenticated, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isSubDealerAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const AdminProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, isAdmin } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    console.log("Access denied to admin route");
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

const App = () => {
  const [totalNotifications, setTotalNotifications] = useState(0);

  return (
    <>
      <Toaster position="top-right" />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/product/:serialNumber" element={<ProductDetails />} />
          <Route
            path="/factory"
            element={
              <FactoryProtectedRoute>
                <FactoryLayout />
              </FactoryProtectedRoute>
            }
          >
            <Route path="dashboard" element={<FactoryDashboard />} />
            <Route path="orders" element={<FactoryOrders />} />
            <Route path="sales" element={<FactorySales />} />
          </Route>

          <Route
            path="/distributor"
            element={
              <DistributorProtectedRoute>
                <DistributorLayout />
              </DistributorProtectedRoute>
            }
          >
            <Route path="dashboard" element={<DistributorDashboard />} />
            <Route path="products" element={<DistributorProducts />} />
            <Route path="dealers" element={<DistributorDealers />} />
            <Route path="dealer-sales" element={<DistributorDealerSales />} />
            <Route
              path="customer-sales"
              element={<DistributorCustomerSales />}
            />
            <Route path="wallet" element={<MyWallet />} />
          </Route>

          <Route
            path="/executive"
            element={
              <ExecutiveProtectedRoute>
                <ExecutiveLayout />
              </ExecutiveProtectedRoute>
            }
          >
            <Route path="dashboard" element={<ExecutiveDashboard />} />
            <Route path="inventory" element={<ExecutiveInventory />} />
            <Route path="distributors" element={<ExecutiveDistributors />} />
            <Route path="dealers" element={<ExecutiveDealers />} />
            <Route path="customers" element={<ExecutiveCustomers />} />
            <Route path="replacement" element={<Replacement />} />
            <Route path="sales" element={<Sales />} />
          </Route>

          <Route
            path="/dealer"
            element={
              <DealerProtectedRoute>
                <DealerLayout />
              </DealerProtectedRoute>
            }
          >
            <Route path="dashboard" element={<DealerDashboard />} />
            <Route path="sub-dealers" element={<SubDealers />} />
            <Route path="products" element={<DealerProducts />} />
            <Route path="sales" element={<DealerSales />} />
            <Route path="wallet" element={<MyWallet />} />
          </Route>

          <Route
            path="/sub-dealer"
            element={
              <SubDealerProtectedRoute>
                <SubDealerLayout />
              </SubDealerProtectedRoute>
            }
          >
            <Route path="dashboard" element={<DealerDashboard />} />
            <Route path="products" element={<DealerProducts />} />
            <Route path="sales" element={<DealerSales />} />
            <Route path="wallet" element={<MyWallet />} />
          </Route>

          <Route
          
            path="/customer"
            element={
              <CustomerProtectedRoute>
                <CustomerLayout />
              </CustomerProtectedRoute>
            }
          >
            <Route path="dashboard" element={<CustomerDashboard />} />
            <Route path="purchases" element={<CustomerPurchases />} />
            <Route path="requests" element={<CustomerRequests />} />
          </Route>

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout totalNotifications={totalNotifications} />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route
              path="notifications"
              element={
                <Notifications setTotalNotifications={setTotalNotifications} />
              }
            />
            <Route
              path="add-members"
              element={
                <AdminProtectedRoute>
                  <AddMembers />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="management"
              element={
                <ProtectedSection section="management">
                  <Management />
                </ProtectedSection>
              }
            />
            <Route
              path="factory-management"
              element={
                <ProtectedSection section="factories">
                  <FactoryManagement />
                </ProtectedSection>
              }
            />
            <Route
              path="orders"
              element={
                <ProtectedSection section="orders">
                  <Orders />
                </ProtectedSection>
              }
            />
            <Route
              path="inventory"
              element={
                <ProtectedSection section="products">
                  <Products />
                </ProtectedSection>
              }
            />
            <Route
              path="sales"
              element={
                <ProtectedSection section="sales">
                  <Sales />
                </ProtectedSection>
              }
            />
            <Route
              path="incentives"
              element={
                <ProtectedSection section="sales">
                  <Incentives />
                </ProtectedSection>
              }
            />
            <Route
              path="incentives/all"
              element={
                <ProtectedSection section="sales">
                  <AllIncentives />
                </ProtectedSection>
              }
            />
            <Route
              path="wallets"
              element={
                <ProtectedSection section="sales">
                  <Wallets />
                </ProtectedSection>
              }
            />
            <Route
              path="wallets/all"
              element={
                <ProtectedSection section="sales">
                  <AllWalletActivity />
                </ProtectedSection>
              }
            />
            <Route
              path="distributors"
              element={
                <ProtectedSection section="distributors">
                  <Distributors />
                </ProtectedSection>
              }
            />
            <Route
              path="dealers"
              element={
                <ProtectedSection section="dealers">
                  <Dealers />
                </ProtectedSection>
              }
            />
            <Route
              path="sub-dealers"
              element={
                <ProtectedSection section="dealers">
                  <SubDealers />
                </ProtectedSection>
              }
            />
            <Route
              path="customers"
              element={
                <ProtectedSection section="customers">
                  <AdminCustomers />
                </ProtectedSection>
              }
            />
            <Route
              path="executives"
              element={
                <AdminProtectedRoute>
                  <Executives />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="replacement"
              element={
                <ProtectedSection section="replacement">
                  <Replacement />
                </ProtectedSection>
              }
            />
            <Route
              path="technicians"
              element={
                <ProtectedSection section="technicians">
                  <Technician />
                </ProtectedSection>
              }
            />
            <Route path="unauthorized" element={<Unauthorized />} />
          </Route>
          <Route
            path="/technician"
            element={
              <TechnicianProtectedRoute>
                <TechnicianLayout />
              </TechnicianProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<TechnicianDashboard />} />
            <Route path="requests" element={<TechnicianRequests />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
};

const Layout = ({ totalNotifications }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <ErrorBoundary>
      <div className="flex h-full">
        <SideBar
          sidebarOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          hasNotifications={totalNotifications > 0}
        />
        <div
          className={`flex-grow overflow-y-auto transition-all duration-300 ease-in-out ${sidebarOpen ? "ml-72" : "ml-16"}`}
        >
          <Outlet />
        </div>
      </div>
    </ErrorBoundary>
  );
};

const TechnicianProtectedRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "technician") {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const FactoryProtectedRoute = ({ children }) => {
  const { isFactoryAuthenticated, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isFactoryAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const DistributorProtectedRoute = ({ children }) => {
  const { isDistributorAuthenticated, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isDistributorAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const DealerProtectedRoute = ({ children }) => {
  const { isDealerAuthenticated, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isDealerAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const ExecutiveProtectedRoute = ({ children }) => {
  const { isExecutiveAuthenticated, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isExecutiveAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const CustomerProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "customer") {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default App;
