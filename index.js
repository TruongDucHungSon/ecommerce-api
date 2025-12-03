import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";

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

// ========================= DATABASE ========================= //
mongoose.set("strictQuery", false);

const connectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("🔥 Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection error:", error);
    process.exit(1); // stop server if DB fail
  }
};

// ========================= MIDDLEWARE ========================= //
app.use(express.json());
app.use(cors());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ========================= ROUTES ========================= //
app.use("/category", categoryRoute);
app.use("/product", productRoute);
app.use("/user", userRoute);
app.use("/auth", authRoute);
app.use("/order", oderRoute);
app.use("/cart", cartRoute);
app.use("/favorite", favoriteRoute);

// ========================= START SERVER ========================= //
const startServer = async () => {
  await connectDb();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

startServer();
