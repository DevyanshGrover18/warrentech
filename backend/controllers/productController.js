import Product from "../models/Product.js";
import Sale from "../models/Sale.js";
import DistributorDealerProduct from "../models/DistributorDealerProduct.js";
import ReplacementRequest from "../models/ReplacementRequest.js";
import { getExecutiveScope, ensureDistributorInScope } from "../utils/executiveScope.js";

const EXPIRING_SOON_DAYS = 30;

const getWarrantyConfig = (product, sale) => {
  if (!sale || !product?.model?.warranty?.length) return null;

  const seller = sale.dealer || sale.distributor || product.distributor;
  return (
    product.model.warranty.find(
      (entry) => seller && entry.state === seller.state && entry.city === seller.city,
    ) ||
    product.model.warranty.find((entry) => seller && entry.state === seller.state) ||
    product.model.warranty[0] ||
    null
  );
};

const getWarrantyInfo = (product, sale) => {
  if (!sale) {
    return {
      status: "Not Sold",
      balanceDays: null,
      expiryDate: null,
    };
  }

  const warrantyConfig = getWarrantyConfig(product, sale);
  if (!warrantyConfig) {
    return {
      status: "No Warranty",
      balanceDays: null,
      expiryDate: null,
    };
  }

  const saleDate = new Date(sale.saleDate || sale.soldAt || product.saleDate);
  const expiryDate = new Date(saleDate);

  if (warrantyConfig.durationType === "Years") {
    expiryDate.setFullYear(expiryDate.getFullYear() + warrantyConfig.duration);
  } else {
    expiryDate.setMonth(expiryDate.getMonth() + warrantyConfig.duration);
  }

  const now = new Date();
  const balanceDays = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

  if (balanceDays < 0) {
    return {
      status: "Expired",
      balanceDays,
      expiryDate,
    };
  }

  if (balanceDays <= EXPIRING_SOON_DAYS) {
    return {
      status: "Expiring Soon",
      balanceDays,
      expiryDate,
    };
  }

  return {
    status: "Active",
    balanceDays,
    expiryDate,
  };
};

export const getProducts = async (req, res) => {
  try {
    const scope = await getExecutiveScope(req.user);
    const filter = scope.isExecutive
      ? { distributor: { $in: scope.distributorIds } }
      : {};

    const products = await Product.find(filter)
      .populate("category")
      .populate("model")
      .populate("factory")
      .populate("distributor")
      .lean();

    const productIds = products.map((product) => product._id);

    const [sales, dealerAssignments] = await Promise.all([
      Sale.find({ product: { $in: productIds } })
        .populate("dealer")
        .populate("distributor")
        .populate("customer")
        .sort({ saleDate: -1, createdAt: -1 })
        .lean(),
      DistributorDealerProduct.find({ product: { $in: productIds } })
        .populate("dealer")
        .lean(),
    ]);

    const latestSaleByProductId = new Map();
    for (const sale of sales) {
      const key = sale.product.toString();
      if (!latestSaleByProductId.has(key)) {
        latestSaleByProductId.set(key, sale);
      }
    }

    const dealerAssignmentByProductId = new Map(
      dealerAssignments.map((assignment) => [assignment.product.toString(), assignment]),
    );

    const enrichedProducts = products.map((product) => {
      const sale = latestSaleByProductId.get(product._id.toString()) || null;
      const assignment = dealerAssignmentByProductId.get(product._id.toString()) || null;
      const warrantyInfo = getWarrantyInfo(product, sale);

      return {
        ...product,
        sale,
        dealer: sale?.dealer || assignment?.dealer || null,
        warrantyInfo,
      };
    });

    res.status(200).json(enrichedProducts);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const getProductBySerialNumber = async (req, res) => {
  try {
    const { serialNumber } = req.params;
    const product = await Product.findOne({ serialNumber });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { serialNumber, productName, price, status } = req.body;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (req.user?.role === "executive" && product.distributor) {
      const inScope = await ensureDistributorInScope(req.user, product.distributor);
      if (!inScope) {
        return res.status(403).json({ message: "Access denied." });
      }
    }

    if (serialNumber && serialNumber !== product.serialNumber) {
      const serialExists = await Product.findOne({ serialNumber });
      if (serialExists) {
        return res.status(400).json({ message: "Serial number already exists" });
      }
      product.serialNumber = serialNumber;
    }

    if (productName) product.productName = productName;
    if (price !== undefined) product.price = price;
    if (status) product.status = status;

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (req.user?.role === "executive" && product.distributor) {
      const inScope = await ensureDistributorInScope(req.user, product.distributor);
      if (!inScope) {
        return res.status(403).json({ message: "Access denied." });
      }
    }

    await Promise.all([
      Sale.deleteMany({ product: product._id }),
      DistributorDealerProduct.deleteMany({ product: product._id }),
      ReplacementRequest.deleteMany({ product: product._id }),
      Product.deleteOne({ _id: product._id }),
    ]);

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
