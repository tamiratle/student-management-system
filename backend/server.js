
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Home route
app.get("/", (req, res) => {
    res.send("Student Management System Backend is running!");
});

// API test route
app.get("/api", (req, res) => {
    res.json({
        success: true,
        message: "Student Management System API is running!"
    });
});

// Student routes
const studentRoutes = require("./routes/studentRoutes");
app.use("/api/students", studentRoutes);

// Administrator authentication routes
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

// User management routes
const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

// Connect MongoDB and start server
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully!");

        app.listen(process.env.PORT || 5000, () => {
            console.log(
                `Server running on port ${process.env.PORT || 5000}`
            );
        });
    })
    .catch((error) => {
        console.error(
            "MongoDB connection failed:",
            error.message
        );
    });
