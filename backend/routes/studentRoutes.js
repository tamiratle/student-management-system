
const express = require("express");
const router = express.Router();

// Import authentication and role authorization
const protect = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authMiddleware");

// Import student controllers
const {
    getStudents,
    getStudent,
    createStudent,
    updateStudent,
    deleteStudent
} = require("../controllers/studentController");

// Protect all student routes
router.use(protect);

// ADMIN, REGISTRAR AND TEACHER: View all students
router.get("/", authorize("admin", "registrar", "teacher"), getStudents);

// ADMIN, REGISTRAR AND TEACHER: View one student
router.get("/:id", authorize("admin", "registrar", "teacher"), getStudent);

// ADMIN AND REGISTRAR: Add student
router.post("/", authorize("admin", "registrar"), createStudent);

// ADMIN AND REGISTRAR: Update student
router.put("/:id", authorize("admin", "registrar"), updateStudent);

// ADMIN ONLY: Delete student
router.delete("/:id", authorize("admin"), deleteStudent);

module.exports = router;
