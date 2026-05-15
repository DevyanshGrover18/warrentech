import Distributor from "../models/Distributor.js";
import Product from "../models/Product.js";
import User from "../models/User.js"; // Import User model
import Dealer from "../models/Dealer.js"; // Import Dealer model
import Executive from "../models/Executive.js";
import bcrypt from "bcryptjs"; // Import bcrypt for password hashing
import { ensureDistributorInScope, getExecutiveScope } from "../utils/executiveScope.js";

const sanitizeDealerIds = (dealerIds = []) => [...new Set(dealerIds.filter(Boolean))];

export const getDistributors = async (req, res) => {
  try {
    const { search } = req.query;
    const scope = await getExecutiveScope(req.user);
    let matchQuery = {};

    if (search) {
      matchQuery = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { state: { $regex: search, $options: "i" } },
          { city: { $regex: search, $options: "i" } },
          { address: { $regex: search, $options: "i" } },
        ],
      };
    }

    if (scope.isExecutive) {
      matchQuery = {
        ...matchQuery,
        _id: { $in: scope.distributorObjectIds },
      };
    }

    const distributors = await Distributor.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: "executives",
          let: { distributorId: "$_id" },
          pipeline: [
            { $unwind: "$assignedDistributors" },
            {
              $match: {
                $expr: {
                  $eq: ["$assignedDistributors.distributorId", "$$distributorId"],
                },
              },
            },
            {
              $project: {
                _id: 1,
                executiveId: 1,
                name: 1,
                assignmentDealerIds: "$assignedDistributors.dealers",
              },
            },
          ],
          as: "executiveAssignment",
        },
      },
      {
        $lookup: {
          from: "products",
          let: { distributorId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$distributor", "$$distributorId"] },
                    { $eq: ["$sold", false] },
                  ],
                },
              },
            },
            {
              $lookup: {
                from: "distributordealerproducts",
                localField: "_id",
                foreignField: "product",
                as: "dealerAssignment",
              },
            },
            {
              $match: {
                dealerAssignment: { $size: 0 },
              },
            },
          ],
          as: "availableProducts",
        },
      },
      {
        $addFields: {
          productCount: { $size: "$availableProducts" },
          executiveAssignment: { $arrayElemAt: ["$executiveAssignment", 0] },
        },
      },
      {
        $addFields: {
          executive: {
            $ifNull: ["$executive", "$executiveAssignment._id"],
          },
          executiveName: "$executiveAssignment.name",
          executiveCode: "$executiveAssignment.executiveId",
          assignmentDealerIds: {
            $ifNull: ["$executiveAssignment.assignmentDealerIds", []],
          },
        },
      },
      {
        $project: {
          availableProducts: 0, // Exclude the actual products array if not needed
          executiveAssignment: 0,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    res.json(distributors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createDistributor = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      username,
      password,
      state,
      city,
      gstNumber,
      contactPerson,
      contactPhone,
    } = req.body;

    // Check if username already exists in User model
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: "Username already taken" });
    }

    // Find the latest distributor to get the last distributor ID
    const latestDistributor = await Distributor.findOne().sort({
      distributorId: -1,
    });

    // Generate new distributor ID
    let newDistributorId;
    if (latestDistributor) {
      const lastNumber = parseInt(
        latestDistributor.distributorId.replace("DIST", ""),
      );
      newDistributorId = `DIST${String(lastNumber + 1).padStart(5, "0")}`;
    } else {
      newDistributorId = "DIST00001";
    }

    // Create the Distributor entry
    const distributor = new Distributor({
      name,
      email,
      phone,
      address,
      username,
      password, // Password will be hashed by pre-save hook in Distributor model
      state,
      city,
      gstNumber,
      contactPerson,
      contactPhone,
      distributorId: newDistributorId,
    });

    const createdDistributor = await distributor.save();

    // Create a corresponding User entry for authentication
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      username,
      password: hashedPassword,
      role: "distributor",
      distributor: createdDistributor._id, // Link to the newly created distributor
    });

    res.status(201).json(createdDistributor);
  } catch (error) {
    console.error("Error creating distributor:", error);
    res.status(400).json({ message: error.message });
  }
};

export const updateDistributor = async (req, res) => {
  try {
    const distributor = await Distributor.findById(req.params.id);
    if (!distributor) {
      return res.status(404).json({ message: "Distributor not found" });
    }

    const updatedDistributor = await Distributor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    res.json(updatedDistributor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteDistributor = async (req, res) => {
  try {
    const distributor = await Distributor.findById(req.params.id);
    if (!distributor) {
      return res.status(404).json({ message: "Distributor not found" });
    }

    await distributor.deleteOne();
    res.json({ message: "Distributor removed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteMultipleDistributors = async (req, res) => {
  try {
    const { distributorIds } = req.body;
    if (!distributorIds || distributorIds.length === 0) {
      return res.status(400).json({ message: "No distributor IDs provided" });
    }
    await Distributor.deleteMany({ _id: { $in: distributorIds } });
    res.json({ message: "Distributors deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

import mongoose from "mongoose";

export const getDistributorProducts = async (req, res) => {
  try {
    const { id } = req.params; // Distributor ID
    const inScope = await ensureDistributorInScope(req.user, id);

    if (!inScope) {
      return res.status(403).json({ message: "Access denied." });
    }

    const products = await Product.aggregate([
      {
        $match: { distributor: new mongoose.Types.ObjectId(id) },
      },
      {
        $lookup: {
          from: "distributordealerproducts",
          localField: "_id",
          foreignField: "product",
          as: "assignment",
        },
      },
      {
        $unwind: {
          path: "$assignment",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "dealers",
          localField: "assignment.dealer",
          foreignField: "_id",
          as: "assignedDealer",
        },
      },
      {
        $unwind: {
          path: "$assignedDealer",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "models",
          localField: "model",
          foreignField: "_id",
          as: "model",
        },
      },
      {
        $unwind: {
          path: "$model",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "factories",
          localField: "factory",
          foreignField: "_id",
          as: "factory",
        },
      },
      {
        $unwind: {
          path: "$factory",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          assignedTo: "$assignedDealer.name",
        },
      },
    ]);

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateDistributorStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const distributor = await Distributor.findById(req.params.id);

    if (!distributor) {
      return res.status(404).json({ message: "Distributor not found" });
    }

    distributor.status = status;
    await distributor.save();

    res.json(distributor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getDistributorDealers = async (req, res) => {
  try {
    const inScope = await ensureDistributorInScope(req.user, req.params.id);

    if (!inScope) {
      return res.status(403).json({ message: "Access denied." });
    }

    const distributor = await Distributor.findById(req.params.id).populate(
      "dealers",
    );
    if (!distributor) {
      return res.status(404).json({ message: "Distributor not found" });
    }

    const dealers = await Distributor.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(req.params.id) },
      },
      {
        $unwind: "$dealers",
      },
      {
        $lookup: {
          from: "dealers",
          localField: "dealers",
          foreignField: "_id",
          as: "dealerInfo",
        },
      },
      {
        $unwind: "$dealerInfo",
      },
      {
        $lookup: {
          from: "distributordealerproducts",
          localField: "dealerInfo._id",
          foreignField: "dealer",
          as: "assignedProducts",
        },
      },
      {
        $addFields: {
          "dealerInfo.productCount": { $size: "$assignedProducts" },
        },
      },
      {
        $replaceRoot: { newRoot: "$dealerInfo" },
      },
      {
        $project: {
          password: 0,
        },
      },
    ]);

    res.json(dealers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const reassignDistributorExecutive = async (req, res) => {
  try {
    const { id } = req.params;
    const { executiveId, dealerIds = [] } = req.body;

    if (!executiveId) {
      return res.status(400).json({ message: "Executive is required" });
    }

    const distributor = await Distributor.findById(id);
    if (!distributor) {
      return res.status(404).json({ message: "Distributor not found" });
    }

    const executive = await Executive.findById(executiveId);
    if (!executive) {
      return res.status(404).json({ message: "Executive not found" });
    }

    const cleanedDealerIds = sanitizeDealerIds(dealerIds);

    if (cleanedDealerIds.length > 0) {
      const dealerCount = await Dealer.countDocuments({
        _id: { $in: cleanedDealerIds },
        distributor: distributor._id,
      });

      if (dealerCount !== cleanedDealerIds.length) {
        return res.status(400).json({
          message: "One or more selected dealers do not belong to this distributor",
        });
      }
    }

    await Executive.updateMany(
      { "assignedDistributors.distributorId": distributor._id },
      { $pull: { assignedDistributors: { distributorId: distributor._id } } },
    );

    await Executive.findByIdAndUpdate(executiveId, {
      $push: {
        assignedDistributors: {
          distributorId: distributor._id,
          dealers: cleanedDealerIds,
        },
      },
    });

    distributor.executive = executive._id;
    await distributor.save();

    const updatedDistributor = await Distributor.aggregate([
      { $match: { _id: distributor._id } },
      {
        $lookup: {
          from: "executives",
          let: { distributorId: "$_id" },
          pipeline: [
            { $unwind: "$assignedDistributors" },
            {
              $match: {
                $expr: {
                  $eq: ["$assignedDistributors.distributorId", "$$distributorId"],
                },
              },
            },
            {
              $project: {
                _id: 1,
                executiveId: 1,
                name: 1,
                assignmentDealerIds: "$assignedDistributors.dealers",
              },
            },
          ],
          as: "executiveAssignment",
        },
      },
      {
        $addFields: {
          executiveAssignment: { $arrayElemAt: ["$executiveAssignment", 0] },
          executiveName: "$executiveAssignment.name",
          executiveCode: "$executiveAssignment.executiveId",
          assignmentDealerIds: {
            $ifNull: ["$executiveAssignment.assignmentDealerIds", []],
          },
        },
      },
      {
        $project: {
          executiveAssignment: 0,
          password: 0,
        },
      },
    ]);

    res.json(updatedDistributor[0]);
  } catch (error) {
    console.error("Error reassigning distributor executive:", error);
    res.status(500).json({ message: error.message });
  }
};

export const createDealerForDistributor = async (req, res) => {
  try {
    const { id } = req.params; // Distributor ID
    const {
      name,
      email,
      contactPhone,
      address,
      username,
      password,
      state,
      city,
      contactPerson,
    } = req.body;

    // Check if username already exists
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: "Username already taken" });
    }

    // Find the latest dealer to get the last dealer ID
    const latestDealer = await Dealer.findOne().sort({ dealerId: -1 });

    // Generate new dealer ID
    let newDealerId;
    if (latestDealer) {
      const lastNumber = parseInt(latestDealer.dealerId.replace("DEAL", ""));
      newDealerId = `DEAL${String(lastNumber + 1).padStart(5, "0")}`;
    } else {
      newDealerId = "DEAL00001";
    }

    // Create the Dealer entry
    const dealer = new Dealer({
      name,
      email,
      contactPhone,
      address,
      username,
      password,
      state,
      city,
      contactPerson,
      distributor: id,
      dealerId: newDealerId,
    });

    const createdDealer = await dealer.save();

    // Add dealer to distributor's dealers array
    await Distributor.findByIdAndUpdate(
      id,
      { $push: { dealers: createdDealer._id } },
      { new: true },
    );

    // Create a corresponding User entry for authentication
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      username,
      password: hashedPassword,
      role: "dealer",
      dealer: createdDealer._id,
    });

    const dealerResponse = createdDealer.toObject();
    delete dealerResponse.password;
    res.status(201).json(dealerResponse);
  } catch (error) {
    console.error("Error creating dealer for distributor:", error);
    res.status(400).json({ message: error.message });
  }
};

export const updateDealerForDistributor = async (req, res) => {
  try {
    const { id, dealerId } = req.params; // Distributor ID and Dealer ID

    const dealer = await Dealer.findById(dealerId);
    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Exclude username and password from update data
    const { username, password, ...updateData } = req.body;

    // Only update username if it's provided and different
    if (username && username !== dealer.username) {
      // Check if new username already exists
      const userExists = await User.findOne({
        username,
        _id: { $ne: dealer._id },
      });
      if (userExists) {
        return res.status(400).json({ message: "Username already taken" });
      }
      updateData.username = username;

      // Update username in User model as well
      await User.findOneAndUpdate(
        { dealer: dealer._id },
        { username: username },
      );
    }

    // Only update password if it's provided
    if (password) {
      updateData.password = password;

      // Update password in User model as well
      const hashedPassword = await bcrypt.hash(password, 10);
      await User.findOneAndUpdate(
        { dealer: dealer._id },
        { password: hashedPassword },
      );
    }

    const updatedDealer = await Dealer.findByIdAndUpdate(dealerId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.json(updatedDealer);
  } catch (error) {
    console.error("Error updating dealer for distributor:", error);
    res.status(400).json({ message: error.message });
  }
};
