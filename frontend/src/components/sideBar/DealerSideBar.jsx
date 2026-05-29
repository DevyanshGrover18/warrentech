import { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LogOut,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

const dealerSidebarItems = [
    {
        title: 'Dashboard',
        path: '/dealer/dashboard',
        icon: LayoutDashboard,
        color: 'blue'
    },
    {
        title: 'Sub Dealers',
        path: '/dealer/sub-dealers',
        icon: Users,
        color: 'purple'
    },
    {
        title: 'Inventory',
        path: '/dealer/products',
        icon: Package,
        color: 'yellow'
    },
    {
        title: 'Sales',
        path: '/dealer/sales',
        icon: ShoppingBag,
        color: 'green'
    },
    {
        title: 'Wallet',
        path: '/dealer/wallet',
        icon: ShoppingBag,
        color: 'emerald'
    }
];

export function DealerSideBar({ sidebarOpen, toggleSidebar }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useContext(AuthContext);

    const isActive = (path) => location.pathname === path;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <>
            <aside
                className={`fixed top-0 left-0 z-40 h-full transition-all duration-300 ease-in-out text-white ${
                    sidebarOpen ? 'w-68' : 'w-16'
                }`}
                aria-label="Sidebar"
            >
                <div className="h-full flex flex-col px-4 pb-4 overflow-y-auto" style={{ background: 'var(--sidebar-bg)' }}>
                    {/* Sidebar Header */}
                    <div
                        className={`flex items-center h-20 ${
                            sidebarOpen ? 'justify-between px-2' : 'justify-center'
                        }`}
                    >
                        {sidebarOpen && (
                            <div className="flex items-center space-x-3">
                                <div>
                                    <div className="text-lg font-extrabold">WarranTech</div>
                                    <div className="text-xs text-white/80 -mt-1">Dealer Dashboard</div>
                                </div>
                            </div>
                        )}
                        <button
                            onClick={toggleSidebar}
                            type="button"
                            className="p-2 text-white rounded-xl hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all duration-200 "
                        >
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            </svg>
                        </button>
                    </div>

                    {/* Sidebar Items */}
                    {sidebarOpen ? (
                        <ul className="mt-1 space-y-1 font-bold">
                            {dealerSidebarItems.map((item, index) => {
                                const Icon = item.icon;
                                return (
                                    <li key={index}>
                                        <Link
                                            to={item.path}
                                            className={`flex items-center py-1 px-3 rounded-xl group transition-all duration-200  ${isActive(item.path) ? 'bg-white' : ''}`}
                                        >
                                            <div
                                                className={`p-2 rounded-full flex items-center justify-center transition-colors duration-200 flex-shrink-0 ${isActive(item.path) ? 'bg-white' : 'bg-white/10'}`}
                                            >
                                                <Icon
                                                    className={`w-5 h-5 ${isActive(item.path) ? 'text-[var(--sidebar-bg)]' : 'text-white/90'}`}
                                                />
                                            </div>
                                            {sidebarOpen && (
                                                <span className={`ml-4 font-bold ${isActive(item.path) ? 'text-[var(--sidebar-bg)]' : 'text-white/90'}`}>{item.title}</span>
                                            )}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <ul className="mt-6 flex flex-col items-center space-y-4">
                            {dealerSidebarItems.map((item, index) => {
                                const Icon = item.icon;
                                const active = isActive(item.path);
                                return (
                                    <li key={index}>
                                        <Link to={item.path} className="block">
                                            <div className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${active ? 'bg-white sidebar-pill' : 'bg-white/10'}`}>
                                                <Icon className={`${active ? 'text-[var(--sidebar-bg)]' : 'text-white/90'} w-4 h-4`} />
                                            </div>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    {/* User Info & Logout */}
                    <div className="mt-auto">
                        <div className="mt-4">
                            {sidebarOpen ? (
                                <button onClick={handleLogout} className="w-full flex items-center py-2 px-3 rounded-xl group transition-all duration-200 hover:bg-white/10 hover:scale-105 active:scale-95">
                                    <div className="p-2 rounded-full flex items-center justify-center transition-colors duration-200 flex-shrink-0 bg-white/10">
                                        <LogOut className="w-5 h-5 text-white/90" />
                                    </div>
                                    <span className="ml-4 font-bold text-white/90">Logout</span>
                                </button>
                            ) : (
                                <div className="flex items-center justify-center">
                                    <button onClick={handleLogout} className="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 bg-white/10 hover:bg-white/20 hover:scale-105 active:scale-95">
                                        <LogOut className="w-4 h-4 text-white/90" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </aside>

            {/* Overlay for Mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/80 sm:hidden"
                    onClick={toggleSidebar}
                ></div>
            )}
        </>
    );
}
