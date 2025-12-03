import express from "express";
import {
  createOrderForUser,
  deleteOrder,
  filterOrderByStatus,
  getAllOrders,
  getOrderDetail,
  getRevenueStatistics,
  getSoldProductsByMonthAndYear,
  getSoldProductsStatistics,
  getSoldProductsStatisticsById,
  updateStatusorder,
  createVNPayPayment,
  VNPayReturn,
} from "../controllers/oder.controller.js";

const router = express.Router();
router.get("/soldProductsStatistics", getSoldProductsStatistics);
router.get("/soldProductsStatisticsById", getSoldProductsStatisticsById);
router.get("/soldProductsByMonthAndYear", getSoldProductsByMonthAndYear);
router.get("/filterOrderByStatus", filterOrderByStatus);
router.get("/:id", getOrderDetail);
router.get("/revenueStatistics", getRevenueStatistics);

router.post("/", createOrderForUser);

router.put("/updateStatusorder", updateStatusorder);
router.delete("/:id", deleteOrder);
router.get("/", getAllOrders);
// payment VNPay
router.post("/payment/vnpay", createVNPayPayment);
router.get("/vnpay-return", VNPayReturn);
export default router;
