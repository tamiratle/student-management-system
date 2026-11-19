
const express = require("express");
const router = express.Router();

// Authentication and authorization
const protect = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authMiddleware");

// User controller
const {
    createUser
} = require("../controllers/userController");

// Protect all user routes
router.use(protect);

// Only administrators can create users
router.post("/", authorize("admin"), createUser);

module.exports = router;
