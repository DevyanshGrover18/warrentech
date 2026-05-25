import UserRole from '../models/UserRole.js';

export const getSalesAccessContext = async (user) => {
    if (!user) {
        return {
            isAdmin: false,
            canAccessSales: false,
            member: null,
        };
    }

    if (user.role === 'admin') {
        return {
            isAdmin: true,
            canAccessSales: true,
            member: null,
        };
    }

    if (user.role !== 'member') {
        return {
            isAdmin: false,
            canAccessSales: false,
            member: null,
        };
    }

    const member = await UserRole.findById(user.id);
    const canAccessSales = Boolean(
        member?.accessControl?.sales?.full ||
        member?.accessControl?.sales?.view ||
        member?.accessControl?.sales?.add ||
        member?.accessControl?.sales?.modify ||
        member?.accessControl?.sales?.delete
    );

    return {
        isAdmin: false,
        canAccessSales,
        member,
    };
};
