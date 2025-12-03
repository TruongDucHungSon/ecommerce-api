import mongoose from "mongoose";
import Product from "../models/product.model.js";

const productController = {
  getTotalProductCount: async (req, res) => {
    try {
      const totalProducts = await Product.countDocuments();
      res.json({ totalProducts });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getAllProducts: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
      const limit = parseInt(req.query.limit) || 10; // Default to 10 products per page if not provided
      const skip = (page - 1) * limit;

      const totalProducts = await Product.countDocuments();
      const products = await Product.find().skip(skip).limit(limit);

      res.json({
        totalProducts,
        page,
        totalPages: Math.ceil(totalProducts / limit),
        products,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getProductDetail: async (req, res) => {
    try {
      const { slug } = req.params;
      const product = await Product.findOne({ slug })
        .populate("category")
        .populate({
          path: "ratings.userId",
          select: "firstName lastName email", // Populate user details in ratings
        });

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getProductStock: async (req, res) => {
    try {
      // Lấy ra productID
      const { id } = req.params;

      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Get the current inventory quantity of the product
      const currentStock = product.stock;

      // Send the product inventory as the response
      res.status(200).json({ id, currentStock });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getFilterProduct: async (req, res) => {
    try {
      const { name, minPrice, maxPrice, brand, sort } = req.query;

      const filter = {};

      if (name) {
        filter.name = { $regex: new RegExp(name, "i") };
      }

      if (minPrice !== undefined && maxPrice !== undefined) {
        filter.price = {
          $gte: parseFloat(minPrice),
          $lte: parseFloat(maxPrice),
        };
      } else if (minPrice !== undefined) {
        filter.price = { $gte: parseFloat(minPrice) };
      } else if (maxPrice !== undefined) {
        filter.price = { $lte: parseFloat(maxPrice) };
      }

      if (brand) {
        filter.brand = brand;
      }

      let sortOption = {};
      if (sort === "Price-Low-High") {
        sortOption = { price: 1 }; // Sort by price in ascending order
      } else if (sort === "Price-High-Low") {
        sortOption = { price: -1 }; // Sort by price in descending order
      }

      const products = await Product.find(filter).sort(sortOption);

      res.status(200).json(products);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
  createProduct: async (req, res) => {
    try {
      const product = new Product(req.body);
      await product.save();
      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  updateProduct: async (req, res) => {
    try {
      const updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      if (!updatedProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(updatedProduct);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  deleteProduct: async (req, res) => {
    try {
      const removedProduct = await Product.findByIdAndRemove(req.params.id);
      if (!removedProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json({ message: "Product removed" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getProductsByCategory: async (req, res) => {
    try {
      const id = req.params.id;
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 20;

      const totalProducts = await Product.countDocuments({
        category: id,
      });

      const totalPages = Math.ceil(totalProducts / pageSize);

      const products = await Product.find({ category: id })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .populate("category");
      res.json({
        page,
        pageSize,
        totalPages,
        totalProducts,
        products,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getNewArrivals: async (req, res) => {
    try {
      // Logic to determine new arrivals, e.g., products added in the last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const newArrivals = await Product.find({
        createdAt: { $gte: sevenDaysAgo },
      }).populate("category");

      res.json({
        products: newArrivals,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getComments: async (req, res) => {
    try {
      const { slug } = req.params;
      const product = await Product.findOne({ slug }, "ratings");
      if (!product) {
        return res.status(404).json({ message: "Sản phẩm không tồn tại." });
      }
      res.json(product.ratings);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Đã có lỗi xảy ra, vui lòng thử lại sau." });
    }
  },

  addRatingAndComment: async (req, res) => {
    try {
      const { userId, rating, comment } = req.body;
      const { slug } = req.params;

      // Ensure rating is within valid range
      if (rating < 1 || rating > 5) {
        return res
          .status(400)
          .json({ message: "Xếp hạng phải nằm trong khoảng từ 1 đến 5." });
      }

      const product = await Product.findOne({ slug });
      if (!product) {
        return res.status(404).json({ message: "Sản phẩm không tồn tại." });
      }

      // Check if user has already rated this product
      const existingRating = product.ratings.find(
        (item) => String(item.userId) === userId
      );
      if (existingRating) {
        return res
          .status(400)
          .json({ message: "Bạn đã xếp hạng cho sản phẩm này trước đó." });
      }

      // Add new rating and comment to the product
      const newComment = {
        userId,
        rating,
        comment,
        _id: new mongoose.Types.ObjectId(),
      };
      product.ratings.push(newComment);
      await product.save();

      res.status(201).json({
        message: "Xếp hạng và bình luận của bạn đã được ghi nhận.",
        newComment,
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Đã có lỗi xảy ra, vui lòng thử lại sau." });
    }
  },

  updateComment: async (req, res) => {
    try {
      const { userId, rating, comment } = req.body;
      const { slug, commentId } = req.params;

      // Ensure rating is within valid range
      if (rating < 1 || rating > 5) {
        return res
          .status(400)
          .json({ message: "Xếp hạng phải nằm trong khoảng từ 1 đến 5." });
      }

      const product = await Product.findOne({ slug });
      if (!product) {
        return res.status(404).json({ message: "Sản phẩm không tồn tại." });
      }

      const existingComment = product.ratings.id(commentId);
      if (!existingComment || String(existingComment.userId) !== userId) {
        return res.status(404).json({
          message: "Bình luận không tồn tại hoặc bạn không có quyền chỉnh sửa.",
        });
      }

      existingComment.rating = rating;
      existingComment.comment = comment;
      await product.save();

      res.json({ message: "Bình luận đã được cập nhật." });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Đã có lỗi xảy ra, vui lòng thử lại sau." });
    }
  },

  deleteComment: async (req, res) => {
    try {
      const { userId } = req.body;
      const { slug, commentId } = req.params;

      const product = await Product.findOne({ slug });
      if (!product) {
        return res.status(404).json({ message: "Sản phẩm không tồn tại." });
      }

      const existingComment = product.ratings.id(commentId);
      if (!existingComment || String(existingComment.userId) !== userId) {
        return res.status(404).json({
          message: "Bình luận không tồn tại hoặc bạn không có quyền xóa.",
        });
      }

      existingComment.remove();
      await product.save();

      res.json({ message: "Bình luận đã được xóa." });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Đã có lỗi xảy ra, vui lòng thử lại sau." });
    }
  },
  getProductCountByCategory: async (req, res) => {
    try {
      const categoryCounts = await Product.aggregate([
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
          },
        },
      ]);

      res.json({
        categoryCounts,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  // total stock
  getTotalStock: async (req, res) => {
    try {
      const result = await Product.aggregate([
        {
          $group: {
            _id: null,
            totalStock: { $sum: "$stock" },
          },
        },
      ]);

      const totalStock = result[0]?.totalStock || 0;

      res.status(200).json({
        totalStock,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
};

export default productController;
