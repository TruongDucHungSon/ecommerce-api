import { format } from "date-fns";
import Order from "../models/oder.model.js";
import qs from "qs";
import crypto from "crypto";

// ---- Hàm sort chỉ khai báo 1 lần ----
function sortObject(obj) {
  let sorted = {};
  let keys = Object.keys(obj).sort();
  keys.forEach((key) => (sorted[key] = obj[key]));
  return sorted;
}

export const createVNPayPayment = async (req, res) => {
  try {
    const ipAddr =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.connection.socket?.remoteAddress;

    const { orderId } = req.body;

    // ---- Lấy total từ DB ----
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const amount = order.total; // Tổng tiền đơn hàng

    const tmnCode = process.env.VNP_TMNCODE;
    const secretKey = process.env.VNP_HASHSECRET;
    let vnpUrl = process.env.VNP_URL;
    const returnUrl = process.env.VNP_RETURNURL;

    const date = new Date();
    const createDate = `${date.getFullYear()}${(
      "0" +
      (date.getMonth() + 1)
    ).slice(-2)}${("0" + date.getDate()).slice(-2)}${date
      .getHours()
      .toString()
      .padStart(2, "0")}${date.getMinutes().toString().padStart(2, "0")}${date
      .getSeconds()
      .toString()
      .padStart(2, "0")}`;

    const vnpParams = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: tmnCode,
      vnp_Locale: "vn",
      vnp_CurrCode: "VND",
      vnp_TxnRef: orderId,
      vnp_OrderInfo: "Thanh toán đơn hàng #" + orderId,
      vnp_OrderType: "billpayment",
      vnp_Amount: amount * 100,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    // ---- Ký dữ liệu ----
    const sortedParams = sortObject(vnpParams);
    const signData = qs.stringify(sortedParams, { encode: false });

    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    sortedParams["vnp_SecureHash"] = signed;

    vnpUrl += "?" + qs.stringify(sortedParams, { encode: false });

    return res.status(200).json({ paymentUrl: vnpUrl, amount });
  } catch (error) {
    console.log(error);
    res.status(500).json("Lỗi tạo thanh toán VNPay");
  }
};

export const VNPayReturn = async (req, res) => {
  try {
    let vnpParams = req.query;
    const secureHash = vnpParams.vnp_SecureHash;

    delete vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHashType;

    const secretKey = process.env.VNP_HASHSECRET;

    const sorted = sortObject(vnpParams);
    const signData = qs.stringify(sorted, { encode: false });

    const checksum = crypto
      .createHmac("sha512", secretKey)
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");

    if (secureHash === checksum) {
      const orderId = vnpParams.vnp_TxnRef;
      const rspCode = vnpParams.vnp_ResponseCode;

      if (rspCode === "00") {
        await Order.findByIdAndUpdate(orderId, {
          status: "Success",
        });

        return res.redirect(`/success?orderId=${orderId}`);
      } else {
        return res.redirect(`/fail?orderId=${orderId}`);
      }
    } else {
      return res.json({ message: "Chữ ký không hợp lệ" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json("VNPay return error");
  }
};

// =================== CRUD Order ===================

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
    const orders = await Order.find();
    const totalRevenue = orders.reduce((acc, order) => acc + order.total, 0);

    res.status(200).json({ totalRevenue });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getSoldProductsStatistics = async (req, res) => {
  try {
    const completedOrders = await Order.find({ status: "Success" });

    const totalSoldProducts = completedOrders.reduce((acc, order) => {
      return (
        acc +
        order.cartItems.reduce(
          (itemAcc, cartItem) => itemAcc + cartItem.quantity,
          0
        )
      );
    }, 0);

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
      const monthYearKey = format(new Date(order.createdAt), "yyyy-MM");

      let exits = monthlyStatistics.find((item) => item.month === monthYearKey);

      if (!exits) {
        exits = {
          month: monthYearKey,
          total: 0,
        };
        monthlyStatistics.push(exits);
      }

      const orderQuantity = order.cartItems.reduce(
        (itemAcc, cartItem) => itemAcc + cartItem.quantity,
        0
      );

      exits.total += orderQuantity;
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
    const order = await Order.findOne({ _id: req.params.id });

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Đơn hàng không tồn tại." });
    }

    await Order.findByIdAndDelete(orderId);

    res.status(204).json({ message: "Đơn hàng đã được xóa thành công." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi trong quá trình xóa đơn hàng." });
  }
};
