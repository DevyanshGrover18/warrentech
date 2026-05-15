import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshDashboardTrigger, setRefreshDashboardTrigger] = useState(0); // New state for triggering dashboard refresh

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = (userData) => {
        localStorage.setItem('user', JSON.stringify(userData));
        // Also store token separately for convenience
        if (userData?.token) {
            localStorage.setItem('token', userData.token);
        }
        setUser(userData);
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    };

    const triggerDashboardRefresh = () => {
        setRefreshDashboardTrigger(prev => prev + 1);
    }; // Function to trigger refresh

    const isAuthenticated = Boolean(user);
    const isAdmin = isAuthenticated && user.role === 'admin';
    const isFactoryAuthenticated = isAuthenticated && user.role === 'factory';
    const isDistributorAuthenticated = isAuthenticated && user.role === 'distributor';
    const isDealerAuthenticated = isAuthenticated && user.role === 'dealer';
    const isTechnicianAuthenticated = isAuthenticated && user.role === 'technician';
    const isExecutiveAuthenticated = isAuthenticated && user.role === 'executive';

    // Check if user has required privileges (support both `privileges` and `accessControl` keys)
    const _privs = user?.privileges || user?.accessControl || null;
    const hasPrivilege = (section, privilege) => {
        if (!user || !_privs || !_privs[section]) return false;
        const sectionPermissions = _privs[section];

        if (sectionPermissions.full) return true;
        
        // If checking for view, return true if any permission is true
        if (privilege === 'view') {
            return sectionPermissions.view || sectionPermissions.add || sectionPermissions.modify || sectionPermissions.delete;
        }
        
        return sectionPermissions[privilege];
    };

    const hasAnyPrivilege = (section) => {
        if (!user || !_privs || !_privs[section]) return false;
        const perms = _privs[section];
        return Boolean(perms.full || perms.view || perms.add || perms.modify || perms.delete);
    };

    const hasFullManagementAccess = () => {
        // Admins always have full management access
        if (isAdmin) return true;
        if (!_privs) return false;
        return _privs.management?.full === true;
    };

    return (
        <AuthContext.Provider value={{ 
            user,
            isAuthenticated,
            isAdmin,
            isFactoryAuthenticated,
            isDistributorAuthenticated,
            isDealerAuthenticated,
            isTechnicianAuthenticated,
            isExecutiveAuthenticated,
            login,
            logout,
            loading,
            refreshDashboardTrigger,
            triggerDashboardRefresh,
            hasPrivilege,
            hasAnyPrivilege,
            hasFullManagementAccess
        }}>
            {children}
        </AuthContext.Provider>
    );
};
