import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import { AuthContext } from "../../context/AuthContext";
import { Building, Shield, ArrowLeft, X, Eye, EyeOff } from "lucide-react";
import DistributorRegister from "./DistributorRegister";
import CustomerAuth from "./CustomerAuth";

const userTypes = [
  {
    id: "admin",
    title: "Admin",
    description: "Full system access",
    icon: Shield,
    bg: "#7C3AED",
  },
  {
    id: "factory",
    title: "Factory",
    description: "Factory management",
    icon: Building,
    bg: "#EF4444",
  },
  {
    id: "member",
    title: "Staff",
    description: "Organization member (custom privileges)",
    icon: Shield,
    bg: "#F59E0B",
  },
  {
    id: "executive",
    title: "Executive",
    description: "Executive operations",
    icon: Shield,
    bg: "#0F766E",
  },
  {
    id: "distributor",
    title: "Distributor",
    description: "Distributor operations",
    icon: Building, // Using Building icon for now, can change later if needed
    bg: "#3B82F6", // A distinct color for distributor
  },
  {
    id: "dealer",
    title: "Dealer",
    description: "Dealer operations",
    icon: Building, // Using Building icon for now, can change later if needed
    bg: "#09b961ff", // A distinct color for dealer
  },
  {
    id: "customer",
    title: "Customer",
    description: "Buyers and end customers",
    icon: Building,
    bg: "#06B6D4",
  },
  {
    id: "technician",
    title: "Technician",
    description: "Technician operations",
    icon: Shield,
    bg: "#10B981",
  },
];

export default function Login() {
  const [selectedUserType, setSelectedUserType] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showDistributorRegister, setShowDistributorRegister] = useState(false); // New state for distributor registration
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!selectedUserType) {
      toast.error("Please select a user type");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/login`,
        {
          username,
          password,
          role: selectedUserType,
        },
      );

      // Ensure admin users have full management access
      const userData = response.data.user;
      if (userData.role === "admin") {
        userData.privileges = {
          ...userData.privileges,
          management: {
            add: true,
            modify: true,
            delete: true,
            full: true,
          },
        };
      }

      login(userData);
      toast.success("Login successful!");

      if (selectedUserType === "admin" || selectedUserType === "member") {
        navigate("/");
      } else if (selectedUserType === "factory") {
        navigate("/factory/dashboard");
      } else if (selectedUserType === "distributor") {
        navigate("/distributor/dashboard");
      } else if (selectedUserType === "dealer") {
        navigate("/dealer/dashboard");
      } else if (selectedUserType === "executive") {
        navigate("/executive/dashboard");
      } else if (selectedUserType === "technician") {
        navigate("/technician/requests");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/request-password-reset`,
        {
          username: forgotUsername,
          role: selectedUserType, // Send the selected user type as role
        },
      );
      toast.success("Password reset request sent to admin!");
      setShowForgotPassword(false);
      setForgotUsername("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Request failed");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="flex md:flex-row flex-col h-full bg-gray-50">
      <div className="hidden md:flex w-1/4 bg-gradient-to-br from-[#5b189b] to-[#5b189b] text-white items-center justify-center p-12">
        <div className="flex flex-col justify-center items-center">
          <img
            src="/Warrantech_logo.png"
            alt="WarranTech Logo"
            className="w-50"
          />
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            WarranTech Dashboard
          </h1>
          <p className="text-md md:text-lg text-gray-200">
            QR-Driven Confidence for Every Product.
          </p>
        </div>
      </div>
      <div className="w-full md:w-3/4 flex items-center justify-center p-8">
        <div className="w-full max-w-4xl">
          {!selectedUserType ? (
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                Welcome Back!
              </h2>
              <p className="text-gray-600 mb-8">
                Please select your user type to continue.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ">
                {userTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedUserType(type.id)}
                      className="rounded-xl shadow-card p-3 text-white transition-transform hover:scale-101 text-left"
                      style={{ background: type.bg }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="bg-white p-2 rounded-md inline-flex items-center justify-center mb-3 shadow-sm">
                            <Icon
                              className="w-5 h-5"
                              style={{ color: type.bg }}
                            />
                          </div>
                          <h3 className="text-lg font-semibold mb-1">
                            {type.title}
                          </h3>
                          <p className="text-sm text-white/80">
                            {type.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : selectedUserType === "distributor" && showDistributorRegister ? (
            <DistributorRegister
              onBack={() => setShowDistributorRegister(false)}
            />
          ) : selectedUserType === "customer" ? (
            <CustomerAuth onBack={() => setSelectedUserType(null)} />
          ) : (
            <div>
              <div className="flex items-center mb-6">
                <button
                  onClick={() => {
                    setSelectedUserType(null);
                    setShowDistributorRegister(false); // Reset registration state
                  }}
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors duration-200 mr-4"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Welcome Back{" "}
                  {selectedUserType === "admin"
                    ? "Admin"
                    : selectedUserType === "member"
                      ? "Staff"
                      : selectedUserType === "factory"
                        ? "Factory"
                        : selectedUserType === "distributor"
                          ? "Distributor"
                          : selectedUserType === "dealer"
                            ? "Dealer"
                            : selectedUserType === "executive"
                              ? "Executive"
                              : "Technician"}
                  !
                </h2>
              </div>
              <p className="text-gray-600 mb-8">
                Please enter your credentials.
              </p>
              <form onSubmit={handleLogin}>
                <div className="mb-6">
                  <label
                    className="block text-gray-700 text-sm font-medium mb-2"
                    htmlFor="username"
                  >
                    Username
                  </label>
                  <input
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent transition-shadow duration-200"
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-6">
                  <label
                    className="block text-gray-700 text-sm font-medium mb-2"
                    htmlFor="password"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent transition-shadow duration-200"
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
                <button
                  className="w-full bg-[#4d55f5] hover:bg-[#3d45e5] text-white font-bold py-3 px-4 rounded-xl focus:outline-none focus:shadow-outline transition-colors duration-200 disabled:opacity-50"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Signing In..." : "Sign In"}
                </button>
                {(selectedUserType === "factory" ||
                  selectedUserType === "distributor" ||
                  selectedUserType === "dealer" ||
                  selectedUserType === "executive") && (
                  <div className="mt-4 text-center flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-[#4d55f5] hover:text-[#3d45e5] text-sm font-medium"
                    >
                      Forgot Password?
                    </button>
                    {selectedUserType === "distributor" && (
                      <button
                        type="button"
                        onClick={() => setShowDistributorRegister(true)}
                        className="text-[#4d55f5] hover:text-[#3d45e5] text-sm font-medium"
                      >
                        Register as Distributor
                      </button>
                    )}
                  </div>
                )}
              </form>
            </div>
          )}
        </div>
      </div>
      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/70 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Forgot Password
              </h3>
              <button
                onClick={() => setShowForgotPassword(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              Enter your username to request a password reset from admin.
            </p>
            <form onSubmit={handleForgotPassword}>
              <div className="mb-4">
                <label
                  className="block text-gray-700 text-sm font-medium mb-2"
                  htmlFor="forgotUsername"
                >
                  Username
                </label>
                <input
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4d55f5] focus:border-transparent"
                  id="forgotUsername"
                  type="text"
                  placeholder="Enter your username"
                  value={forgotUsername}
                  onChange={(e) => setForgotUsername(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col md:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="flex-1 bg-[#4d55f5] hover:bg-[#3d45e5] text-white py-2 px-4 rounded-xl disabled:opacity-50"
                >
                  {forgotLoading ? "Sending..." : "Send Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
