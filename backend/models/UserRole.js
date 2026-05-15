import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
    view: { type: Boolean, default: false },
    add: { type: Boolean, default: false },
    modify: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
    full: { type: Boolean, default: false }
});

const accessControlSchema = new mongoose.Schema({
    management: permissionSchema,
    factories: permissionSchema,
    orders: permissionSchema,
    products: permissionSchema,
    distributors: permissionSchema,
    dealers: permissionSchema,
    sales: permissionSchema,
    customers: permissionSchema,
    replacement: permissionSchema,
    technicians: permissionSchema,
    notifications: permissionSchema
});

const userRoleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    accessControl: {
        type: accessControlSchema,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserRole'
    }
}, {
    timestamps: true
});

// Method to check if user has specific permission
userRoleSchema.methods.hasPermission = function(section, permission) {
    if (!this.accessControl || !this.accessControl[section]) {
        return false;
    }
    const sectionPermissions = this.accessControl[section];
    if (sectionPermissions.full) return true;
    
    // If checking for view, return true if any permission is true
    if (permission === 'view') {
        return sectionPermissions.view || sectionPermissions.add || sectionPermissions.modify || sectionPermissions.delete;
    }
    
    return sectionPermissions[permission];
};

// Method to check if user has any access to a section
userRoleSchema.methods.hasAccessToSection = function(section) {
    if (!this.accessControl || !this.accessControl[section]) {
        return false;
    }
    const sectionPermissions = this.accessControl[section];
    return sectionPermissions.full || sectionPermissions.view || sectionPermissions.add || sectionPermissions.modify || sectionPermissions.delete;
};

// Static method to create admin user
userRoleSchema.statics.createAdminUser = async function(adminData) {
    const fullAccess = {
        view: true,
        add: true,
        modify: true,
        delete: true,
        full: true
    };

    const adminAccessControl = {
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

    const admin = new this({
        ...adminData,
        accessControl: adminAccessControl
    });

    return admin.save();
};

const UserRole = mongoose.model('UserRole', userRoleSchema);

export default UserRole;
