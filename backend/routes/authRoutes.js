
const express = require("express");
const router = express.Router();

const {
    loginAdmin,
    changePassword
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");

// Import role authorization
const { authorize } = require("../middleware/authMiddleware");

// Administrator login
router.post("/login", loginAdmin);

// Change administrator password
router.put("/change-password", protect, changePassword);

// Future user-management routes will be added here.
// Only administrators will be allowed to manage user accounts.

module.exports = router;
