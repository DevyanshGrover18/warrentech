import mongoose from "mongoose";
import Executive from "../models/Executive.js";
import User from "../models/User.js";
import Sale from "../models/Sale.js";
import ReplacementRequest from "../models/ReplacementRequest.js";

const normalizeIds = (ids = []) => ids.map((id) => id.toString());
const normalizeObjectIds = (ids = []) =>
  ids
    .filter(Boolean)
    .map((id) =>
      id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(id),
    );
const extractDistributorIds = (assignedDistributors = []) =>
  assignedDistributors
    .map((assignment) => assignment?.distributorId)
    .filter(Boolean);
const extractDealerIds = (assignedDistributors = []) =>
  assignedDistributors.flatMap((assignment) => assignment?.dealers || []).filter(Boolean);
const extractSubDealerIds = (assignedDistributors = []) =>
  assignedDistributors.flatMap((assignment) => assignment?.subDealers || []).filter(Boolean);

export const getExecutiveScope = async (user) => {
  if (!user || user.role !== "executive") {
    return {
      executive: null,
      distributorIds: [],
      distributorObjectIds: [],
      dealerIds: [],
      dealerObjectIds: [],
      subDealerIds: [],
      subDealerObjectIds: [],
      isExecutive: false,
    };
  }

  let executiveId = user.executive;

  if (!executiveId) {
    const linkedUser = await User.findById(user.id).select("executive").lean();
    executiveId = linkedUser?.executive;
  }

  const executive = await Executive.findById(executiveId)
    .select("status assignedDistributors")
    .lean();

  if (!executive || executive.status === "Inactive") {
    return {
      executive: null,
      distributorIds: [],
      distributorObjectIds: [],
      dealerIds: [],
      dealerObjectIds: [],
      subDealerIds: [],
      subDealerObjectIds: [],
      isExecutive: true,
    };
  }

  const distributorRefs = extractDistributorIds(executive.assignedDistributors || []);
  const dealerRefs = extractDealerIds(executive.assignedDistributors || []);
  const subDealerRefs = extractSubDealerIds(executive.assignedDistributors || []);
  const distributorIds = normalizeIds(distributorRefs);
  const distributorObjectIds = normalizeObjectIds(distributorRefs);
  const dealerIds = normalizeIds(dealerRefs);
  const dealerObjectIds = normalizeObjectIds(dealerRefs);
  const subDealerIds = normalizeIds(subDealerRefs);
  const subDealerObjectIds = normalizeObjectIds(subDealerRefs);

  return {
    executive,
    distributorIds,
    distributorObjectIds,
    dealerIds,
    dealerObjectIds,
    subDealerIds,
    subDealerObjectIds,
    isExecutive: true,
  };
};

export const ensureDistributorInScope = async (user, distributorId) => {
  const scope = await getExecutiveScope(user);

  if (!scope.isExecutive) {
    return true;
  }

  return scope.distributorIds.includes(distributorId.toString());
};

export const getDealerIdsForExecutiveScope = async (user) => {
  const scope = await getExecutiveScope(user);

  if (!scope.isExecutive || scope.distributorIds.length === 0) {
    return [];
  }

  return scope.dealerIds;
};

export const getSubDealerIdsForExecutiveScope = async (user) => {
  const scope = await getExecutiveScope(user);

  if (!scope.isExecutive || scope.distributorIds.length === 0) {
    return [];
  }

  return scope.subDealerIds;
};

export const getCustomerIdsForExecutiveScope = async (user) => {
  const scope = await getExecutiveScope(user);

  if (!scope.isExecutive || scope.distributorIds.length === 0) {
    return [];
  }

  const dealerIds = await getDealerIdsForExecutiveScope(user);
  const subDealerIds = await getSubDealerIdsForExecutiveScope(user);

  const sales = await Sale.find({
    $or: [
      { distributor: { $in: scope.distributorIds } },
      { dealer: { $in: dealerIds } },
      { sub_dealer: { $in: subDealerIds } },
    ],
    customer: { $ne: null },
  })
    .select("customer")
    .lean();

  return [...new Set(normalizeIds(sales.map((sale) => sale.customer)))];
};

export const getReplacementRequestIdsForExecutiveScope = async (user) => {
  const scope = await getExecutiveScope(user);

  if (!scope.isExecutive || scope.distributorIds.length === 0) {
    return [];
  }

  const requests = await ReplacementRequest.aggregate([
    {
      $lookup: {
        from: "products",
        localField: "product",
        foreignField: "_id",
        as: "productInfo",
      },
    },
    { $unwind: "$productInfo" },
    {
      $match: {
        "productInfo.distributor": {
          $in: scope.distributorIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
      },
    },
    { $project: { _id: 1 } },
  ]);

  return normalizeIds(requests.map((request) => request._id));
};
