const express = require("express");
const router = express.Router();
const { getDepartments, createDepartment, updateDepartment, deleteDepartment } = require("../controller/departmentController");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");

router.get("/", verifyToken, getDepartments);
router.post("/", verifyToken, authorizeRole("admin", "hr"), createDepartment);
router.put("/:id", verifyToken, authorizeRole("admin", "hr"), updateDepartment);
router.delete("/:id", verifyToken, authorizeRole("admin"), deleteDepartment);

module.exports = router;
