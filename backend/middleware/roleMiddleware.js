import jwt from 'jsonwebtoken';
import UserRole from '../models/UserRole.js';

const fullAccess = {
    view: true,
    add: true,
    modify: true,
    delete: true,
    full: true
};

const adminPermissions = {
    management: fullAccess,
    factories: fullAccess,
    orders: fullAccess,
    products: fullAccess,
    distributors: fullAccess,
    dealers: fullAccess,
    sales: fullAccess,
    customers: fullAccess,
    replacement: fullAccess,
    technicians: fullAccess,
    notifications: fullAccess
};

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token.' });
    }
};

const checkPermission = (section, permission) => {
    return async (req, res, next) => {
        try {
            const user = await UserRole.findById(req.user.id);

            // If a UserRole document is not found, allow access for users with 'admin' role
            if (!user) {
                if (req.user.role === 'admin') {
                    req.userPermissions = adminPermissions;
                    return next();
                }

                if (req.user.role === 'executive' && ['products', 'distributors', 'dealers', 'customers', 'replacement'].includes(section)) {
                    return next();
                }

                return res.status(404).json({ message: 'User not found.' });
            }

            if (!user.isActive) {
                return res.status(403).json({ message: 'User account is inactive.' });
            }

            // Check if user has full access or specific permission
            const hasAccess = user.hasPermission(section, permission);

            if (!hasAccess) {
                return res.status(403).json({ 
                    message: `Access denied. Insufficient permissions for ${section} ${permission}.`
                });
            }

            // Add user's permissions to the request for use in routes
            req.userPermissions = user.accessControl;
            next();
        } catch (error) {
            res.status(500).json({ message: 'Error checking permissions.' });
        }
    };
};

// Helper middleware to check multiple permissions
const checkMultiplePermissions = (permissionsArray) => {
    return async (req, res, next) => {
        try {
            const user = await UserRole.findById(req.user.id);
            
            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }

            if (!user.isActive) {
                return res.status(403).json({ message: 'User account is inactive.' });
            }

            // Check all required permissions
            const hasAllPermissions = permissionsArray.every(({ section, permission }) => 
                user.hasPermission(section, permission)
            );

            if (!hasAllPermissions) {
                return res.status(403).json({ 
                    message: 'Access denied. Insufficient permissions.'
                });
            }

            req.userPermissions = user.accessControl;
            next();
        } catch (error) {
            res.status(500).json({ message: 'Error checking permissions.' });
        }
    };
};

const checkSectionAccess = (section) => {
    return async (req, res, next) => {
        try {
            const user = await UserRole.findById(req.user.id);
            const executiveAllowedSections = ['products', 'distributors', 'dealers', 'customers', 'replacement', 'sales'];

            // If a UserRole document is not found, allow access for users with 'admin' role
            if (!user) {
                if (req.user.role === 'admin') {
                    req.userPermissions = adminPermissions;
                    return next();
                }

                if (req.user.role === 'executive' && executiveAllowedSections.includes(section)) {
                    return next();
                }

                return res.status(404).json({ message: 'User not found.' });
            }

            if (!user.isActive) {
                return res.status(403).json({ message: 'User account is inactive.' });
            }

            // Check if user has any access to the section
            const hasAccess = user.hasAccessToSection(section);

            if (!hasAccess) {
                if (req.user.role === 'executive' && executiveAllowedSections.includes(section)) {
                    return next();
                }

                return res.status(403).json({ 
                    message: `Access denied. You do not have permission to view this section.`
                });
            }

            // Add user's permissions to the request for use in routes
            req.userPermissions = user.accessControl;
            next();
        } catch (error) {
            res.status(500).json({ message: 'Error checking permissions.' });
        }
    };
};

export { verifyToken, checkPermission, checkMultiplePermissions, checkSectionAccess };
