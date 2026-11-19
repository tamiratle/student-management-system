
const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");

// CREATE NEW USER
const createUser = async (req, res) => {
    try {
        const { username, password, role } = req.body;

        // Check required fields
        if (!username || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "Please provide username, password and role."
            });
        }

        // Validate role
        const allowedRoles = ["admin", "registrar", "teacher"];

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user role."
            });
        }

        // Validate password
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 8 characters."
            });
        }

        // Check if username already exists
        const existingUser = await Admin.findOne({
            username: username.trim()
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Username already exists."
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const newUser = await Admin.create({
            username: username.trim(),
            password: hashedPassword,
            role
        });

        res.status(201).json({
            success: true,
            message: "User created successfully.",
            user: {
                id: newUser._id,
                username: newUser.username,
                role: newUser.role
            }
        });

    } catch (error) {
        console.error("Create user error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create user."
        });
    }
};

module.exports = {
    createUser
};
