import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },

    name: { type: String, required: true },

    address: { type: String, required: true },
    province: { type: String, required: true },
    district: { type: String, required: true },
    commune: { type: String, required: true },

    note: String,
    phone: { type: String, required: true },

    cartItems: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          default: 1,
        },
        size: {
          type: String,
          required: true,
        },
      },
    ],

    total: {
      type: Number,
      required: true,
    },

    // 🔥 Trạng thái đơn hàng
    status: {
      type: String,
      enum: ["Pending", "Processing", "Shipping", "Completed", "Cancelled"],
      default: "Pending",
    },

    // 🔥 Trạng thái thanh toán
    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Paid", "Failed"],
      default: "Unpaid",
    },

    paymentMethod: {
      type: String,
      enum: ["COD", "VNPay", "PayOS"],
      default: "PayOS",
    },

    // 🔥 Mã thanh toán PayOS / VNPay
    paymentCode: {
      type: Number, // thay vì Number
    },
    // 🔥 Mã giao dịch trả về từ cổng thanh toán
    transactionId: {
      type: String,
    },
  },
  { timestamps: true } // tự tạo createdAt + updatedAt
);

const Order = mongoose.model("Order", orderSchema);

export default Order;
