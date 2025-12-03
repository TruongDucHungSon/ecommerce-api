import express from "express";
import productController from "../controllers/product.controller.js";

const router = express.Router();

router.get("/", productController.getAllProducts);
// Lọc sản phẩm
router.get("/filterProduct", productController.getFilterProduct);
// Kiểm tra số lượng tồn sản phẩm
router.get("/stock/:id", productController.getProductStock);
// Đếm sản phẩm theo danh mục
router.get("/countByCategories", productController.getProductCountByCategory);
// Đếm tổng số sản phẩm
router.get("/countProducts", productController.getTotalProductCount);

// Thêm, sửa, xóa sản phẩm
router.post("/", productController.createProduct);
router.put("/:id", productController.updateProduct);
router.delete("/:id", productController.deleteProduct);

// Lấy chi tiết sản phẩm
router.get("/:slug", productController.getProductDetail);
// Lấy sản phẩm theo danh mục
router.get("/category/:id", productController.getProductsByCategory);
// lấy tổng sản phẩm trong cửa hàng
router.get("/total-stock", productController.getTotalStock);

// Bình luận và đánh giá sản phẩm
router.post("/:slug/ratings", productController.addRatingAndComment);
router.get("/:slug/ratings", productController.getComments);
router.put("/:slug/ratings/:commentId", productController.updateComment);
router.delete("/:slug/ratings/:commentId", productController.deleteComment);

export default router;
