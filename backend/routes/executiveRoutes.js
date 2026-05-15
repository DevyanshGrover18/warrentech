import express from "express";
import {
  // Executive CRUD
  getExecutives,
  createExecutive,
  updateExecutive,
  deleteExecutive,
  deleteMultipleExecutives,
  updateExecutiveStatus,
  getExecutiveDistributors,
  createDistributorForExecutive,
  updateDistributorForExecutive,
  deleteDistributorForExecutive,
} from "../controllers/executiveController.js";
import { verifyToken, checkPermission } from "../middleware/roleMiddleware.js";

const router = express.Router();

// ─── Executive Routes ─────────────────────────────────────────────────────────
router.get("/", verifyToken, checkPermission("management", "view"), getExecutives);
router.post("/", verifyToken, checkPermission("management", "add"), createExecutive);
router.put("/:id", verifyToken, checkPermission("management", "modify"), updateExecutive);
router.delete("/:id", verifyToken, checkPermission("management", "delete"), deleteExecutive);
router.post("/delete-multiple", verifyToken, checkPermission("management", "delete"), deleteMultipleExecutives);
router.patch("/:id/status", verifyToken, checkPermission("management", "modify"), updateExecutiveStatus);

// ─── Distributor Routes (under Executive) ────────────────────────────────────
router.get("/:id/distributors", verifyToken, checkPermission("management", "view"), getExecutiveDistributors);
router.post("/:id/distributors", verifyToken, checkPermission("management", "add"), createDistributorForExecutive);
router.put("/:id/distributors/:distributorId", verifyToken, checkPermission("management", "modify"), updateDistributorForExecutive);
router.delete("/:id/distributors/:distributorId", verifyToken, checkPermission("management", "delete"), deleteDistributorForExecutive);

export default router;