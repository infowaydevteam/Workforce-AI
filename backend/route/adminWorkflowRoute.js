const express = require("express");
const {
  getSubscriptionPlans,
  getOrganizationSetup,
  updateOrganizationSetup,
  getDepartments,
  addDepartment,
  updateDepartment,
  deleteDepartment,
  addHoliday,
  deleteHoliday,
  addProductivityRule,
  updateProductivityRule,
  deleteProductivityRule,
} = require("../controller/adminWorkflowController");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(verifyToken, authorizeRole("admin","superadmin"));

router.get("/subscription-plans", getSubscriptionPlans);
router.get("/organizations/:organizationId/setup", getOrganizationSetup);
router.put("/organizations/:organizationId/setup", updateOrganizationSetup);

router.get("/departments", getDepartments);
router.post("/departments", addDepartment);
router.put("/departments/:id", updateDepartment);
router.delete("/departments/:id", deleteDepartment);

router.post("/holidays", addHoliday);
router.delete("/holidays/:id", deleteHoliday);

router.post("/productivity-rules", addProductivityRule);
router.put("/productivity-rules/:id", updateProductivityRule);
router.delete("/productivity-rules/:id", deleteProductivityRule);

module.exports = router;
