import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";

import authRoute from "./routes/auth.routes.js";
import cartRoute from "./routes/cart.routes.js";
import categoryRoute from "./routes/category.routes.js";
import favoriteRoute from "./routes/favorite.routes.js";
import oderRoute from "./routes/oder.routes.js";
import productRoute from "./routes/product.routes.js";
import userRoute from "./routes/user.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ================= MIDDLEWARE ================= //
app.use(
  cors({
    origin: "*", // Hoặc domain frontend của bạn
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// ================= ROUTES ================= //
app.use("/category", categoryRoute);
app.use("/product", productRoute);
app.use("/user", userRoute);
app.use("/auth", authRoute);
app.use("/order", oderRoute);
app.use("/cart", cartRoute);
app.use("/favorite", favoriteRoute);

// ================= CONNECT DB ================= //
const connectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("🔥 Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection error:", error);
    process.exit(1); // Stop server nếu DB fail
  }
};

// ================= START SERVER ================= //
const startServer = async () => {
  await connectDb();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startServer();
