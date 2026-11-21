
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

// =========================
// JWT CONFIGURATION
// =========================

function getJWTSecret() {
    const secret = process.env.JWT_SECRET;

    if (!secret || !secret.trim()) {
        throw new Error(
            "JWT_SECRET environment variable is not configured."
        );
    }

    return secret;
}


// =========================
// ADMIN / USER LOGIN
// =========================

const loginAdmin = async (req, res) => {

    try {

        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {

            return res.status(400).json({
                success: false,
                message: "Please enter username and password."
            });

        }

        // Check JWT configuration before login
        let jwtSecret;

        try {

            jwtSecret = getJWTSecret();

        } catch (error) {

            console.error(error.message);

            return res.status(500).json({
                success: false,
                message: "Server authentication is not configured. Please contact the administrator."
            });

        }

        // Find account
        const admin = await Admin.findOne({
            username: username.trim()
        });

        if (!admin) {

            return res.status(401).json({
                success: false,
                message: "Invalid username or password."
            });

        }

        // Verify password
        const passwordMatch = await bcrypt.compare(
            password,
            admin.password
        );

        if (!passwordMatch) {

            return res.status(401).json({
                success: false,
                message: "Invalid username or password."
            });

        }

        // Preserve existing default role behavior
        if (!admin.role) {

            admin.role = "admin";

            await admin.save();

        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: admin._id.toString(),
                username: admin.username,
                role: admin.role
            },
            jwtSecret,
            {
                expiresIn: "1d"
            }
        );

        // Successful login response
        return res.status(200).json({

            success: true,

            message: "Login successful.",

            token,

            admin: {
                id: admin._id,
                username: admin.username,
                role: admin.role
            }

        });

    } catch (error) {

        console.error("Login error:", error);

        return res.status(500).json({

            success: false,

            message: "Login failed."

        });

    }

};


// =========================
// CHANGE ADMIN PASSWORD
// =========================

const changePassword = async (req, res) => {

    try {

        const {
            currentPassword,
            newPassword,
            confirmPassword
        } = req.body;

        // Validate fields
        if (
            !currentPassword ||
            !newPassword ||
            !confirmPassword
        ) {

            return res.status(400).json({
                success: false,
                message: "Please fill in all password fields."
            });

        }

        // Validate password length
        if (newPassword.length < 8) {

            return res.status(400).json({
                success: false,
                message: "New password must contain at least 8 characters."
            });

        }

        // Confirm new password
        if (newPassword !== confirmPassword) {

            return res.status(400).json({
                success: false,
                message: "New passwords do not match."
            });

        }

        // Prevent using the same password
        if (currentPassword === newPassword) {

            return res.status(400).json({
                success: false,
                message: "New password must be different."
            });

        }

        // Find administrator
        if (!req.admin || !req.admin.id) {

            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });

        }

        const admin = await Admin.findById(req.admin.id);

        if (!admin) {

            return res.status(404).json({
                success: false,
                message: "Administrator not found."
            });

        }

        // Verify current password
        const passwordMatch = await bcrypt.compare(
            currentPassword,
            admin.password
        );

        if (!passwordMatch) {

            return res.status(401).json({
                success: false,
                message: "Current password is incorrect."
            });

        }

        // Hash new password
        admin.password = await bcrypt.hash(
            newPassword,
            12
        );

        await admin.save();

        return res.status(200).json({

            success: true,

            message: "Password changed successfully. Please log in again."

        });

    } catch (error) {

        console.error("Password change error:", error);

        return res.status(500).json({

            success: false,

            message: "Password change failed."

        });

    }

};


// =========================
// EXPORT CONTROLLERS
// =========================

module.exports = {
    loginAdmin,
    changePassword
};
