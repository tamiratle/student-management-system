
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

// ADMIN LOGIN
const loginAdmin = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Please enter username and password."
            });
        }

        const admin = await Admin.findOne({
            username: username.trim()
        });

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password."
            });
        }

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

        // Assign admin role to existing accounts without a role
        if (!admin.role) {
            admin.role = "admin";
            await admin.save();
        }

        const token = jwt.sign(
            {
                id: admin._id,
                username: admin.username,
                role: admin.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(200).json({
            success: true,
            message: "Login successful.",
            token,
            admin: {
                username: admin.username,
                role: admin.role
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            success: false,
            message: "Login failed."
        });
    }
};

// CHANGE ADMIN PASSWORD
const changePassword = async (req, res) => {
    try {
        const {
            currentPassword,
            newPassword,
            confirmPassword
        } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Please fill in all password fields."
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: "New password must contain at least 8 characters."
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "New passwords do not match."
            });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({
                success: false,
                message: "New password must be different."
            });
        }

        const admin = await Admin.findById(req.admin.id);

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Administrator not found."
            });
        }

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

        admin.password = await bcrypt.hash(newPassword, 12);
        await admin.save();

        res.status(200).json({
            success: true,
            message: "Password changed successfully. Please log in again."
        });

    } catch (error) {
        console.error("Password change error:", error);

        res.status(500).json({
            success: false,
            message: "Password change failed."
        });
    }
};

module.exports = {
    loginAdmin,
    changePassword
};
