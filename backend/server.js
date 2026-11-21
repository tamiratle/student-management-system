
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Server configuration
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

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

// Health check route
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        server: "running",
        database: mongoose.connection.readyState === 1
            ? "connected"
            : "disconnected"
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

// Start server immediately
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Connect MongoDB separately
async function connectMongoDB() {
    if (!MONGO_URI) {
        console.error("MONGO_URI environment variable is missing!");
        return;
    }

    try {
        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 10000
        });

        console.log("MongoDB connected successfully!");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        console.log("Retrying MongoDB connection in 15 seconds...");

        setTimeout(connectMongoDB, 15000);
    }
}

connectMongoDB();
