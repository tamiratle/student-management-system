
const jwt = require("jsonwebtoken");

// VERIFY LOGIN TOKEN
const protect = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Access denied. Please log in."
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.admin = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired login token."
        });
    }
};


// CHECK USER ROLE
const authorize = (...allowedRoles) => {
    return (req, res, next) => {

        if (!req.admin || !req.admin.role) {
            return res.status(403).json({
                success: false,
                message: "User role not found. Please log in again."
            });
        }

        if (!allowedRoles.includes(req.admin.role)) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to perform this action."
            });
        }

        next();
    };
};


module.exports = protect;
module.exports.authorize = authorize;
