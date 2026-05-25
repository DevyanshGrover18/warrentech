import { useState, useContext, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LogOut,
  Building,
  Package,
  Users,
  LayoutDashboard,
  Settings,
  ShoppingCart,
  ChevronDown,
  RefreshCw,
  IndianRupee,
  Wallet,
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import NotificationIcon from '../global/NotificationIcon';

const sidebarItems = [
  {
    title: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
    color: 'blue',
  },
  {
    title: 'Add Members',
    icon: Users,
    color: 'orange',
    children: [
      {
        title: 'Staff',
        path: '/add-members',
      },
      {
        title: 'Executives',
        path: '/executives',
      },
      {
        title: 'Distributors',
        path: '/distributors',
      },
      {
        title: 'Dealers',
        path: '/dealers',
      },
      {
        title: 'Technicians',
        path: '/technicians',
      },
    ],
  },
  {
    title: 'Management',
    path: '/management',
    icon: Settings,
    color: 'indigo',
  },
  {
    title: 'Factories',
    icon: Building,
    color: 'green',
    children: [
      {
        title: 'Factory Management',
        path: '/factory-management',
      },
      {
        title: 'Orders',
        path: '/orders',
      },
    ],
  },
  {
    title: 'Inventory',
    path: '/inventory',
    icon: Package,
    color: 'yellow',
  },
  {
    title: 'Sales',
    path: '/sales',
    icon: ShoppingCart,
    color: 'green',
  },
  {
    title: 'Incentives',
    path: '/incentives',
    icon: IndianRupee,
    color: 'emerald',
  },
  {
    title: 'Wallets',
    path: '/wallets',
    icon: Wallet,
    color: 'lime',
  },
  {
    title: 'Customers',
    path: '/customers',
    icon: Users,
    color: 'teal',
  },
  {
    title: 'Replacement',
    path: '/replacement',
    icon: RefreshCw,
    color: 'cyan',
  },
];

export function SideBar({ sidebarOpen, toggleSidebar, totalNotifications }) {
  const [openDropdowns, setOpenDropdowns] = useState({});
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasPrivilege, isAdmin } = useContext(AuthContext);

  const pathToSection = {
    '/management': 'management',
    '/factory-management': 'factories',
    '/orders': 'orders',
    '/products': 'products',
    '/distributors': 'distributors',
    '/dealers': 'dealers',
    '/customers': 'customers',
    '/executives': 'management',
    '/add-members': 'management',
    '/sales': 'sales',
    '/incentives': 'sales',
    '/wallets': 'sales',
    '/replacement': 'replacement',
    '/technicians': 'technicians',
  };

  const canAccessSection = (section) => {
    if (!section) return true;
    if (isAdmin) return true;
    return (
      hasPrivilege(section, 'full') ||
      hasPrivilege(section, 'add') ||
      hasPrivilege(section, 'modify') ||
      hasPrivilege(section, 'delete')
    );
  };

  useEffect(() => {
    if (!sidebarOpen) {
      setOpenDropdowns({});
    }
  }, [sidebarOpen]);

  const isActive = (path) => location.pathname === path;
  const isChildActive = (children) => children.some((child) => isActive(child.path));
  const isDropdownOpen = (title) => !!openDropdowns[title];

  const toggleDropdown = (title) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const canAccessChild = (child) => {
    if (child.path === '/add-members' || child.path === '/executives') {
      return isAdmin;
    }

    const section = pathToSection[child.path] || null;
    return canAccessSection(section);
  };

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
        <div
          className="h-full flex flex-col px-4 pb-4 overflow-y-auto"
          style={{ background: 'var(--sidebar-bg)' }}
        >
          <div
            className={`flex items-center h-20 ${
              sidebarOpen ? 'justify-between px-2' : 'justify-center'
            }`}
          >
            {sidebarOpen && (
              <div className="flex items-center space-x-3">
                <div>
                  <div className="text-lg font-extrabold">WarranTech</div>
                  <div className="text-xs text-white/80 -mt-1">Admin Dashboard</div>
                </div>
              </div>
            )}
            <button
              onClick={toggleSidebar}
              type="button"
              className="p-2 text-white rounded-xl hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all duration-200"
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

          {sidebarOpen ? (
            <ul className="mt-1 space-y-1 font-bold">
              {sidebarItems
                .filter((item) => {
                  if (item.path === '/') return true;
                  if (item.children) {
                    return item.children.some((child) => canAccessChild(child));
                  }
                  const section = pathToSection[item.path] || null;
                  return canAccessSection(section);
                })
                .map((item, index) => {
                  const Icon = item.icon;

                  if (item.children) {
                    const visibleChildren = item.children.filter((child) => canAccessChild(child));
                    const active = isChildActive(item.children);

                    return (
                      <li key={index}>
                        <button
                          onClick={() => toggleDropdown(item.title)}
                          type="button"
                          className={`flex items-center w-full py-0.5 px-2 rounded-xl group transition-all duration-200 font-bold ${
                            active ? 'bg-white sidebar-pill' : ''
                          }`}
                        >
                          <div
                            className={`p-2 rounded-full transition-colors duration-200 flex-shrink-0 ${
                              active ? 'bg-[var(--primary-purple)]' : 'bg-white/10'
                            }`}
                          >
                            <Icon
                              className={`w-5 h-5 ${active ? 'text-white' : 'text-white/90'}`}
                            />
                          </div>
                          <span
                            className={`flex-1 ml-4 text-left font-bold text-sm ${
                              active ? 'text-[var(--sidebar-bg)]' : 'text-white/90'
                            }`}
                          >
                            {item.title}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isDropdownOpen(item.title) ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {isDropdownOpen(item.title) && (
                          <ul className="pl-11 mt-1 space-y-0.5">
                            {visibleChildren.map((child, childIndex) => (
                              <li key={childIndex}>
                                <Link
                                  to={child.path}
                                  className={`block py-0.5 px-3 rounded-md text-sm whitespace-nowrap ${
                                    isActive(child.path)
                                      ? 'bg-white/20 text-white'
                                      : 'text-white/80 hover:bg-white/10'
                                  }`}
                                >
                                  {child.title}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  }

                  return (
                    <li key={index}>
                      <Link
                        to={item.path}
                        className={`flex items-center py-0.5 px-2 rounded-xl group transition-all duration-200 ${
                          isActive(item.path) ? 'bg-white' : ''
                        }`}
                      >
                        <div
                          className={`p-2 rounded-full flex items-center justify-center transition-colors duration-200 flex-shrink-0 ${
                            isActive(item.path) ? 'bg-white' : 'bg-white/10'
                          }`}
                        >
                          {item.showIcon ? (
                            <NotificationIcon count={totalNotifications} />
                          ) : (
                            <Icon
                              className={`w-5 h-5 ${
                                isActive(item.path)
                                  ? 'text-[var(--sidebar-bg)]'
                                  : 'text-white/90'
                              }`}
                            />
                          )}
                        </div>
                        <span
                          className={`ml-4 font-bold text-sm ${
                            isActive(item.path)
                              ? 'text-[var(--sidebar-bg)]'
                              : 'text-white/90'
                          }`}
                        >
                          {item.title}
                        </span>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          ) : (
            <ul className="mt-6 flex flex-col items-center space-y-2">
              {sidebarItems
                .filter((item) => {
                  if (item.path === '/') return true;
                  if (item.children) {
                    return item.children.some((child) => canAccessChild(child));
                  }
                  const section = pathToSection[item.path] || null;
                  return canAccessSection(section);
                })
                .map((item, index) => {
                  const Icon = item.icon;
                  const active = item.children
                    ? isChildActive(item.children)
                    : isActive(item.path);

                  return (
                    <li key={index}>
                      {item.children ? (
                        <button
                          onClick={() => {
                            if (!sidebarOpen) toggleSidebar();
                            toggleDropdown(item.title);
                          }}
                          className="block"
                        >
                          <div
                            className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                              active ? 'bg-white sidebar-pill' : 'bg-white/10'
                            }`}
                          >
                            <Icon
                              className={`${
                                active ? 'text-[var(--sidebar-bg)]' : 'text-white/90'
                              } w-4 h-4`}
                            />
                          </div>
                        </button>
                      ) : (
                        <Link to={item.path} className="block">
                          <div
                            className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                              active ? 'bg-white sidebar-pill' : 'bg-white/10'
                            }`}
                          >
                            {item.showIcon ? (
                              <NotificationIcon count={totalNotifications} />
                            ) : (
                              <Icon
                                className={`${
                                  active ? 'text-[var(--sidebar-bg)]' : 'text-white/90'
                                } w-4 h-4`}
                              />
                            )}
                          </div>
                        </Link>
                      )}
                    </li>
                  );
                })}
            </ul>
          )}

          <div className="mt-auto flex items-center justify-center">
            {sidebarOpen ? (
              <div className="flex items-center space-x-2">
                {user?.role === 'admin' && (
                  <Link
                    to="/notifications"
                    className={`p-2 rounded-full flex items-center justify-center transition-colors duration-200 flex-shrink-0 ${
                      isActive('/notifications')
                        ? 'bg-[var(--primary-purple)]'
                        : 'bg-white/10'
                    }`}
                  >
                    <div
                      className={
                        isActive('/notifications') ? 'text-white' : 'text-white/90'
                      }
                    >
                      <NotificationIcon count={totalNotifications} />
                    </div>
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-full flex items-center justify-center transition-colors duration-200 flex-shrink-0 bg-white/10"
                >
                  <LogOut className="w-5 h-5 text-white/90" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                {user?.role === 'admin' && (
                  <Link to="/notifications" className="flex items-center justify-center">
                    <div
                      className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                        isActive('/notifications')
                          ? 'bg-white sidebar-pill'
                          : 'bg-white/10'
                      }`}
                    >
                      <div
                        className={
                          isActive('/notifications')
                            ? 'text-[var(--sidebar-bg)]'
                            : 'text-white/90'
                        }
                      >
                        <NotificationIcon count={totalNotifications} />
                      </div>
                    </div>
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 bg-white/10 hover:bg-white/20 hover:scale-105 active:scale-95"
                >
                  <LogOut className="w-4 h-4 text-white/90" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
        ></div>
      )}
    </>
  );
}
