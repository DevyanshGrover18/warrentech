import User from "../models/User.js";
import UserRole from "../models/UserRole.js";
import Factory from "../models/Factory.js";
import Distributor from "../models/Distributor.js";
import Dealer from "../models/Dealer.js";
import Executive from "../models/Executive.js";
import PasswordResetRequest from "../models/PasswordResetRequest.js";
import Customer from "../models/Customer.js";
import Sale from "../models/Sale.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"; // Import jsonwebtoken

// Helper function to generate JWT
const generateToken = (id, role, distributor, factory, dealer, subDealer, assignedDistributors) => {
  return jwt.sign(
    { id, role, distributor, factory, dealer, subDealer, assignedDistributors },
    process.env.JWT_SECRET,
    {
      expiresIn: "6h",
    },
  );
};

export const signupAdmin = async (req, res) => {
  try {
    const { username, password, role, factoryId, distributorId, dealerId } = req.body;

    // --- Validation ---
    if (!username || !password || !role) {
      return res.status(400).json({ message: "Username, password, and role are required" });
    }

    const validRoles = ["admin", "factory", "distributor", "dealer"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: `Invalid role. Must be one of: ${validRoles.join(", ")}` });
    }


    // --- Check for duplicate username + role combo ---
    const existingUser = await User.findOne({ username, role });
    if (existingUser) {
      return res.status(409).json({ message: "User with this username and role already exists" });
    }

    // --- Role-specific entity validation ---
    let factory = null, distributor = null, dealer = null;

    if (role === "factory") {
      if (!factoryId) {
        return res.status(400).json({ message: "factoryId is required for factory role" });
      }
      factory = await Factory.findById(factoryId);
      if (!factory) {
        return res.status(404).json({ message: "Factory not found" });
      }
    }

    if (role === "distributor") {
      if (!distributorId) {
        return res.status(400).json({ message: "distributorId is required for distributor role" });
      }
      distributor = await Distributor.findById(distributorId);
      if (!distributor) {
        return res.status(404).json({ message: "Distributor not found" });
      }
    }

    if (role === "dealer") {
      if (!dealerId) {
        return res.status(400).json({ message: "dealerId is required for dealer role" });
      }
      dealer = await Dealer.findById(dealerId);
      if (!dealer) {
        return res.status(404).json({ message: "Dealer not found" });
      }
    }

    // --- Hash password & create user ---
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username,
      password: hashedPassword,
      role,
      ...(factory     && { factory:     factory._id }),
      ...(distributor && { distributor: distributor._id }),
      ...(dealer      && { dealer:      dealer._id }),
      isActive: true,
    });

    // --- Re-fetch with populated fields (same shape as login response) ---
    const populatedUser = await User.findById(newUser._id).populate(
      role === "factory"     ? "factory"     :
      role === "distributor" ? "distributor" :
      role === "dealer"      ? "dealer"      : null
    );

    const userData = {
      id:          populatedUser._id,
      username:    populatedUser.username,
      role:        populatedUser.role,
      factory:     populatedUser.factory     ?? null,
      distributor: populatedUser.distributor ?? null,
      dealer:      populatedUser.dealer      ?? null,
      token: generateToken(
        populatedUser._id,
        populatedUser.role,
        populatedUser.distributor?._id,
        populatedUser.factory?._id,
        populatedUser.dealer?._id,
        populatedUser.subDealer?._id || populatedUser.subDealer,
      ),
    };

    return res.status(201).json({ success: true, user: userData });

  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    let user;
    if (role === "factory") {
      user = await User.findOne({
        username,
        role,
        isActive: true,
      }).populate("factory");
    } else if (role === "distributor") {
      user = await User.findOne({
        username,
        role,
        isActive: true,
      }).populate("distributor");
    } else if (role === "dealer") {
      user = await User.findOne({
        username,
        role,
        isActive: true,
      }).populate("dealer");
    } else if (role === "sub_dealer") {
      user = await User.findOne({
        username,
        role,
        isActive: true,
      }).populate("subDealer");
    } else if (role === "executive") {
      user = await User.findOne({
        username,
        role,
        isActive: true,
      }).populate({
        path: "executive",
        populate: [
          {
            path: "assignedDistributors.distributorId",
            select: "name distributorId state city status",
          },
          {
            path: "assignedDistributors.dealers",
            select: "name dealerId state city status contactPerson contactPhone",
          },
        ],
      });
    } else {
      user = await User.findOne({
        username,
        role,
        isActive: true,
      });
    }

    if (!user || !(await bcrypt.compare(password, user.password))) {
      // If not found in User collection, try UserRole collection (members created via admin)
      const member = await UserRole.findOne({ username, isActive: true });
      if (!member || !(await bcrypt.compare(password, member.password))) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const memberData = {
        id: member._id,
        username: member.username,
        role: "member",
        accessControl: member.accessControl,
        privileges: member.accessControl, // for frontend compatibility
        token: generateToken(member._id, "member"),
      };

      return res.json({ user: memberData });
    }

    const userData = {
      id: user._id,
      username: user.username,
      role: user.role,
      factory: user.factory,
      distributor: user.distributor,
      dealer: user.dealer,
      subDealer: user.subDealer,
      executive: user.executive,
      assignedDistributors: user.executive?.assignedDistributors || [],
      token: generateToken(
        user._id,
        user.role,
        user.distributor?._id,
        user.factory?._id,
        user.dealer?._id,
        user.subDealer?._id || user.subDealer,
        user.executive?.assignedDistributors?.map((assignment) => assignment.distributorId?._id || assignment.distributorId) || [],
      ), // Generate and include token with role
    };

    res.json({ user: userData });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const createDefaultUsers = async (req, res) => {
  try {
    // Create admin user
    const adminExists = await User.findOne({
      username: "admin",
      role: "admin",
    });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await User.create({
        username: "admin",
        password: hashedPassword,
        role: "admin",
      });
    }

    // Create factory users for each factory
    const factories = await Factory.find();
    for (const factory of factories) {
      const factoryUserExists = await User.findOne({
        username: `factory_${factory.name.toLowerCase().replace(/\s+/g, "_")}`,
        role: "factory",
      });

      if (!factoryUserExists) {
        const hashedPassword = await bcrypt.hash("factory123", 10);
        await User.create({
          username: `factory_${factory.name.toLowerCase().replace(/\s+/g, "_")}`,
          password: hashedPassword,
          role: "factory",
          factory: factory._id,
        });
      }
    }

    // Create distributor users for each distributor
    const distributors = await Distributor.find();
    for (const distributor of distributors) {
      const distributorUserExists = await User.findOne({
        username: `distributor_${distributor.name.toLowerCase().replace(/\s+/g, "_")}`,
        role: "distributor",
      });

      if (!distributorUserExists) {
        const hashedPassword = await bcrypt.hash("distributor123", 10);
        await User.create({
          username: `distributor_${distributor.name.toLowerCase().replace(/\s+/g, "_")}`,
          password: hashedPassword,
          role: "distributor",
          distributor: distributor._id,
        });
      }
    }

    res.json({ message: "Default users created successfully" });
  } catch (error) {
    console.error("Error creating default users:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getFactoryUsers = async (req, res) => {
  try {
    const factoryUsers = await User.find({ role: "factory" }).populate(
      "factory",
    );
    res.json(factoryUsers);
  } catch (error) {
    console.error("Error fetching factory users:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const requestPasswordReset = async (req, res) => {
  try {
    const { username, role } = req.body; // Expect role in request body

    let user;
    if (role === "factory") {
      user = await User.findOne({ username, role }).populate("factory");
    } else if (role === "distributor") {
      user = await User.findOne({ username, role }).populate("distributor");
    } else if (role === "dealer") {
      user = await User.findOne({ username, role }).populate("dealer");
    } else if (role === "executive") {
      user = await User.findOne({ username, role }).populate("executive");
    } else {
      return res
        .status(400)
        .json({ message: "Invalid role for password reset" });
    }

    if (!user) {
      return res.status(404).json({ message: `${role} user not found` });
    }

    const existingRequest = await PasswordResetRequest.findOne({
      username,
      status: "pending",
      role: role, // Add role to the query
    });

    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "Password reset request already pending" });
    }

    const newRequestData = {
      username,
      role,
    };

    if (role === "factory") {
      newRequestData.factory = user.factory._id;
    } else if (role === "distributor") {
      newRequestData.distributor = user.distributor._id;
    } else if (role === "dealer") {
      newRequestData.dealer = user.dealer._id;
    } else if (role === "executive") {
      newRequestData.executive = user.executive._id;
    }

    await PasswordResetRequest.create(newRequestData);

    res.json({ message: "Password reset request sent to admin" });
  } catch (error) {
    console.error("Password reset request error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getPasswordResetRequests = async (req, res) => {
  try {
    const requests = await PasswordResetRequest.find({ status: "pending" })
      .populate("factory")
      .populate("distributor")
      .populate("executive")
      .sort({ requestedAt: -1 });
    res.json(requests);
  } catch (error) {
    console.error("Error fetching password reset requests:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { requestId, newPassword } = req.body;

    const request = await PasswordResetRequest.findById(requestId);
    if (!request || request.status !== "pending") {
      return res.status(404).json({ message: "Invalid or completed request" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updateOne(
      { username: request.username, role: request.role }, // Use role from request
      { password: hashedPassword },
    );

    request.status = "completed";
    request.completedAt = new Date();
    await request.save();

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const declinePasswordResetRequest = async (req, res) => {
  try {
    const { id } = req.params;
    await PasswordResetRequest.findByIdAndDelete(id);
    res.json({ message: "Password reset request declined" });
  } catch (error) {
    console.error("Decline password reset request error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Customer registration
export const registerCustomer = async (req, res) => {
  try {
    const { name, phone, email, address, password } = req.body;

    if (!name || !phone || !password) {
      return res
        .status(400)
        .json({ message: "Name, phone and password are required" });
    }

    const existing = await Customer.findOne({ phone });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Customer with this phone already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const customer = await Customer.create({
      name,
      phone,
      email,
      address,
      password: hashed,
    });

    const userData = {
      id: customer._id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      role: "customer",
      token: generateToken(customer._id, "customer"),
    };

    // Link any existing sales that were recorded with this phone to the newly created customer
    try {
      await Sale.updateMany(
        { customerPhone: phone },
        { customer: customer._id },
      );
    } catch (linkErr) {
      console.error("Error linking existing sales to customer:", linkErr);
    }

    res.status(201).json({ user: userData });
  } catch (error) {
    console.error("Register customer error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Customer login
export const loginCustomer = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res
        .status(400)
        .json({ message: "Phone and password are required" });
    }

    const customer = await Customer.findOne({ phone });
    if (!customer || !(await bcrypt.compare(password, customer.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const userData = {
      id: customer._id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      role: "customer",
      token: generateToken(customer._id, "customer"),
    };

    res.json({ user: userData });
  } catch (error) {
    console.error("Customer login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
