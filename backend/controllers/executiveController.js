import Executive from "../models/Executive.js";
import Distributor from "../models/Distributor.js";
import Dealer from "../models/Dealer.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const sanitizeAssignmentRows = (assignedDistributors = []) =>
  assignedDistributors
    .filter((row) => row?.distributorId)
    .map((row) => ({
      distributorId: row.distributorId,
      dealers: (row.dealerIds || row.dealers || []).filter(Boolean),
    }));

const buildExecutivePayload = (body, { includePassword = false } = {}) => {
  const payload = {
    name: body.name,
    email: body.email,
    address: body.address,
    username: body.username,
    state: body.state,
    city: body.city,
    gstNumber: body.gstNumber,
    contactPerson: body.contactPerson,
    contactPhone: body.contactPhone || body.phone || "",
    status: body.status,
    assignedDistributors: sanitizeAssignmentRows(body.assignedDistributors),
  };

  if (includePassword && body.password) {
    payload.password = body.password;
  }

  return payload;
};

const hydrateExecutive = async (executiveDoc) => {
  const executive = executiveDoc.toObject ? executiveDoc.toObject() : executiveDoc;
  const assignments = executive.assignedDistributors || [];
  const distributorIds = assignments.map((row) => row.distributorId).filter(Boolean);

  const distributors = await Distributor.find({ _id: { $in: distributorIds } })
    .select("-password")
    .lean();

  const distributorsById = new Map(
    distributors.map((distributor) => [distributor._id.toString(), distributor]),
  );

  const allDealerIds = assignments.flatMap((row) => row.dealers || []).filter(Boolean);
  const dealers = allDealerIds.length
    ? await Dealer.find({ _id: { $in: allDealerIds } }).select("-password").lean()
    : [];
  const dealersById = new Map(dealers.map((dealer) => [dealer._id.toString(), dealer]));

  const populatedDistributors = assignments
    .map((row) => {
      const distributor = distributorsById.get(row.distributorId.toString());
      if (!distributor) return null;

      return {
        ...distributor,
        dealers: (row.dealers || [])
          .map((dealerId) => dealersById.get(dealerId.toString()))
          .filter(Boolean),
      };
    })
    .filter(Boolean);

  return {
    ...executive,
    distributors: populatedDistributors,
    distributorCount: populatedDistributors.length,
    dealerCount: populatedDistributors.reduce(
      (count, distributor) => count + (distributor.dealers?.length || 0),
      0,
    ),
  };
};

const findExecutiveWithDistributor = async (executiveId, distributorId) =>
  Executive.findOne({
    _id: executiveId,
    "assignedDistributors.distributorId": distributorId,
  });

export const getExecutives = async (req, res) => {
  try {
    const { search } = req.query;
    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { state: { $regex: search, $options: "i" } },
            { city: { $regex: search, $options: "i" } },
            { address: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const executives = await Executive.find(query).sort({ createdAt: -1 });
    const hydratedExecutives = await Promise.all(executives.map(hydrateExecutive));

    res.json(hydratedExecutives);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createExecutive = async (req, res) => {
  try {
    const { username, password } = req.body;

    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: "Username already taken" });
    }

    const latestExecutive = await Executive.findOne({}).sort({ executiveId: -1 });

    let newExecutiveId;
    if (latestExecutive) {
      const lastNumber = parseInt(latestExecutive.executiveId.replace("EXEC", ""), 10);
      newExecutiveId = `EXEC${String(lastNumber + 1).padStart(5, "0")}`;
    } else {
      newExecutiveId = "EXEC00001";
    }

    const executive = new Executive({
      ...buildExecutivePayload(req.body, { includePassword: true }),
      executiveId: newExecutiveId,
    });

    const createdExecutive = await executive.save();

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      username,
      password: hashedPassword,
      role: "executive",
      executive: createdExecutive._id,
    });

    res.status(201).json(await hydrateExecutive(createdExecutive));
  } catch (error) {
    console.error("Error creating executive:", error);
    res.status(400).json({ message: error.message });
  }
};

export const updateExecutive = async (req, res) => {
  try {
    const executive = await Executive.findById(req.params.id);
    if (!executive) {
      return res.status(404).json({ message: "Executive not found" });
    }

    const { username, password, ...payload } = buildExecutivePayload(req.body);

    if (username && username !== executive.username) {
      const userExists = await User.findOne({
        username,
        executive: { $ne: executive._id },
      });
      if (userExists) {
        return res.status(400).json({ message: "Username already taken" });
      }
      payload.username = username;
      await User.findOneAndUpdate({ executive: executive._id }, { username });
    }

    if (req.body.password) {
      payload.password = req.body.password;
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      await User.findOneAndUpdate({ executive: executive._id }, { password: hashedPassword });
    }

    const updatedExecutive = await Executive.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    res.status(200).json(await hydrateExecutive(updatedExecutive));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteExecutive = async (req, res) => {
  try {
    const executive = await Executive.findById(req.params.id);
    if (!executive) {
      return res.status(404).json({ message: "Executive not found" });
    }

    await User.findOneAndDelete({ executive: executive._id });
    await executive.deleteOne();
    res.json({ message: "Executive removed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteMultipleExecutives = async (req, res) => {
  try {
    const { executiveIds } = req.body;
    if (!executiveIds || executiveIds.length === 0) {
      return res.status(400).json({ message: "No executive IDs provided" });
    }

    await User.deleteMany({ executive: { $in: executiveIds } });
    await Executive.deleteMany({ _id: { $in: executiveIds } });
    res.json({ message: "Executives deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateExecutiveStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const executive = await Executive.findById(req.params.id);

    if (!executive) {
      return res.status(404).json({ message: "Executive not found" });
    }

    executive.status = status;
    await executive.save();

    res.json(executive);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getExecutiveDistributors = async (req, res) => {
  try {
    const executive = await Executive.findById(req.params.id).lean();
    if (!executive) {
      return res.status(404).json({ message: "Executive not found" });
    }

    const distributorIds = (executive.assignedDistributors || [])
      .map((row) => row.distributorId)
      .filter(Boolean);

    const distributors = await Distributor.aggregate([
      {
        $match: {
          _id: { $in: distributorIds.map((id) => new mongoose.Types.ObjectId(id)) },
        },
      },
      {
        $lookup: {
          from: "products",
          let: { distId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$distributor", "$$distId"] },
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
            { $match: { dealerAssignment: { $size: 0 } } },
          ],
          as: "availableProducts",
        },
      },
      {
        $addFields: {
          productCount: { $size: "$availableProducts" },
        },
      },
      {
        $project: {
          password: 0,
          availableProducts: 0,
        },
      },
    ]);

    res.json(distributors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createDistributorForExecutive = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password } = req.body;

    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: "Username already taken" });
    }

    const executive = await Executive.findById(id);
    if (!executive) {
      return res.status(404).json({ message: "Executive not found" });
    }

    const latestDistributor = await Distributor.findOne().sort({
      distributorId: -1,
    });

    let newDistributorId;
    if (latestDistributor) {
      const lastNumber = parseInt(
        latestDistributor.distributorId.replace("DIST", ""),
        10,
      );
      newDistributorId = `DIST${String(lastNumber + 1).padStart(5, "0")}`;
    } else {
      newDistributorId = "DIST00001";
    }

    const distributor = new Distributor({
      name: req.body.name,
      email: req.body.email,
      address: req.body.address,
      username,
      password,
      state: req.body.state,
      city: req.body.city,
      gstNumber: req.body.gstNumber,
      contactPerson: req.body.contactPerson,
      contactPhone: req.body.contactPhone || req.body.phone || "",
      distributorId: newDistributorId,
      executive: id,
    });

    const createdDistributor = await distributor.save();

    await Executive.findByIdAndUpdate(id, {
      $push: {
        assignedDistributors: {
          distributorId: createdDistributor._id,
          dealers: [],
        },
      },
    });

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      username,
      password: hashedPassword,
      role: "distributor",
      distributor: createdDistributor._id,
    });

    const distributorResponse = createdDistributor.toObject();
    delete distributorResponse.password;
    res.status(201).json(distributorResponse);
  } catch (error) {
    console.error("Error creating distributor for executive:", error);
    res.status(400).json({ message: error.message });
  }
};

export const updateDistributorForExecutive = async (req, res) => {
  try {
    const { id, distributorId } = req.params;

    const distributor = await Distributor.findById(distributorId);
    if (!distributor) {
      return res.status(404).json({ message: "Distributor not found" });
    }

    const executive = await findExecutiveWithDistributor(id, distributorId);
    if (!executive) {
      return res
        .status(403)
        .json({ message: "Distributor does not belong to this executive" });
    }

    const { username, password, ...updateData } = req.body;
    updateData.contactPhone = req.body.contactPhone || req.body.phone || "";

    if (username && username !== distributor.username) {
      const userExists = await User.findOne({
        username,
        distributor: { $ne: distributor._id },
      });
      if (userExists) {
        return res.status(400).json({ message: "Username already taken" });
      }
      updateData.username = username;
      await User.findOneAndUpdate({ distributor: distributor._id }, { username });
    }

    if (password) {
      updateData.password = password;
      const hashedPassword = await bcrypt.hash(password, 10);
      await User.findOneAndUpdate({ distributor: distributor._id }, { password: hashedPassword });
    }

    const updatedDistributor = await Distributor.findByIdAndUpdate(distributorId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.json(updatedDistributor);
  } catch (error) {
    console.error("Error updating distributor for executive:", error);
    res.status(400).json({ message: error.message });
  }
};

export const deleteDistributorForExecutive = async (req, res) => {
  try {
    const { id, distributorId } = req.params;

    const distributor = await Distributor.findById(distributorId);
    if (!distributor) {
      return res.status(404).json({ message: "Distributor not found" });
    }

    const executive = await findExecutiveWithDistributor(id, distributorId);
    if (!executive) {
      return res
        .status(403)
        .json({ message: "Distributor does not belong to this executive" });
    }

    await Executive.findByIdAndUpdate(id, {
      $pull: { assignedDistributors: { distributorId: distributor._id } },
    });

    await User.findOneAndDelete({ distributor: distributor._id });
    await distributor.deleteOne();
    res.json({ message: "Distributor removed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
