import { format } from "date-fns";
import Order from "../models/oder.model.js";
import qs from "qs";
import crypto from "crypto";
import { payos } from "../config/payos.js";
// ====== PayOS Config ======

// ========================= ORIGINAL API ============================= //

export const createOrderForUser = async (req, res) => {
  try {
    const {
      name,
      address,
      province,
      district,
      commune,
      phone,
      cartItems,
      total,
      userId,
    } = req.body;

    const order = new Order({
      userId,
      name,
      address,
      province,
      district,
      commune,
      phone,
      cartItems,
      total,
      status: "Pending",
      createdAt: new Date(),
      paymentStatus: "Unpaid",
      paymentMethod: "COD",
    });

    await order.save();

    res.status(201).json({ message: "success", order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate("cartItems.productId");
    res.status(200).json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const filterOrderByStatus = async (req, res) => {
  try {
    const status = req.query.status;
    const query = {};
    if (status !== "All") query.status = status;

    const orders = await Order.find(query).sort({ createdAt: -1 });
    res.status(200).json({ data: orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateStatusorder = async (req, res) => {
  try {
    const { id, status } = req.body;

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    );

    res.status(200).json({
      status: "Update order status successfully",
      data: updatedOrder,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getRevenueStatistics = async (req, res) => {
  try {
    const orders = await Order.find({ status: "Success" });
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

    res.status(200).json({ totalRevenue });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getSoldProductsStatistics = async (req, res) => {
  try {
    const completedOrders = await Order.find({ status: "Success" });

    const totalSoldProducts = completedOrders.reduce(
      (sum, order) =>
        sum + order.cartItems.reduce((qty, item) => qty + item.quantity, 0),
      0
    );

    res.status(200).json({ totalSoldProducts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getSoldProductsByMonthAndYear = async (req, res) => {
  try {
    const completedOrders = await Order.find({ status: "Success" }).sort({
      createdAt: -1,
    });

    const monthlyStatistics = [];

    completedOrders.forEach((order) => {
      const key = format(new Date(order.createdAt), "yyyy-MM");

      let row = monthlyStatistics.find((i) => i.month === key);
      if (!row) {
        row = { month: key, total: 0 };
        monthlyStatistics.push(row);
      }

      const qty = order.cartItems.reduce((sum, item) => sum + item.quantity, 0);

      row.total += qty;
    });

    res.status(200).json(monthlyStatistics);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getSoldProductsStatisticsById = async (req, res) => {
  try {
    const result = await Order.aggregate([
      { $match: { status: "Success" } },
      { $unwind: "$cartItems" },
      {
        $group: {
          _id: "$cartItems._id",
          totalQuantitySold: { $sum: "$cartItems.quantity" },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productInfo",
        },
      },
    ]);

    res.status(200).json({ productSales: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getOrderDetail = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    res.status(200).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order)
      return res.status(404).json({ message: "Đơn hàng không tồn tại." });

    await Order.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Đơn hàng đã được xóa thành công." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi trong quá trình xóa đơn hàng." });
  }
};

// =========================== PAYOS PAYMENT =============================== //

export const createPayOSPayment = async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({ message: "Missing data" });
    }

    // 🔥 Tạo mã orderCode PayOS
    const orderCode = Math.floor(Math.random() * 999999);

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // 🔥 Save order code vào DB
    order.paymentCode = orderCode;
    await order.save();

    // 🔥 Tạo link thanh toán
    const paymentLink = await payos.paymentRequests.create({
      orderCode: order._id,
      amount: Number(amount),
      description: `ĐH ${order._id.slice(0, 10)}`, // 🔥 <= max 25 ký tự
      returnUrl: process.env.PAYOS_RETURN_URL,
      cancelUrl: process.env.PAYOS_CANCEL_URL,
    });

    return res.status(200).json({
      checkoutUrl: paymentLink.checkoutUrl, // 👈 field FE cần
      orderCode,
    });
  } catch (err) {
    console.log("PayOS error:", err);
    return res.status(500).json({ message: "Payment error" });
  }
};

export const PayOSWebhook = async (req, res) => {
  try {
    const data = req.body;

    // Xác thực webhook
    const verified = payos.verifyPaymentWebhookData(data);

    if (!verified) return res.status(400).json({ message: "Webhook invalid" });

    const orderId = verified.description.split("#")[1];

    const order = await Order.findById(orderId);

    if (!order)
      return res.status(404).json({ message: "Không tìm thấy order" });

    if (verified.resultCode === "00") {
      order.paymentStatus = "Paid";
      order.status = "Success";
    } else {
      order.paymentStatus = "Failed";
      order.status = "Failed";
    }

    await order.save();

    res.status(200).json({ message: "Webhook processed" });
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).json({ message: "Webhook xử lý lỗi" });
  }
};
