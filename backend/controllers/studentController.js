
const Student = require("../models/Student");

// 1. Get all students
const getStudents = async (req, res) => {
    try {
        const students = await Student.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: students.length,
            data: students
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// 2. Get one student
const getStudent = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });
        }

        res.status(200).json({
            success: true,
            data: student
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Invalid student ID"
        });
    }
};

// 3. Add a new student
const createStudent = async (req, res) => {
    try {
        const { id, name, gender, email, department, year } = req.body;

        const existingStudent = await Student.findOne({
            $or: [
                ...(id ? [{ id }] : []),
                ...(email ? [{ email: email.toLowerCase() }] : [])
            ]
        });

        if (existingStudent) {
            return res.status(409).json({
                success: false,
                message: "Student ID or email already exists"
            });
        }

        const student = await Student.create({
            id,
            name,
            gender,
            email,
            department,
            year
        });

        res.status(201).json({
            success: true,
            message: "Student added successfully",
            data: student
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// 4. Update student
const updateStudent = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });
        }

        const { id, name, gender, email, department, year } = req.body;

        const duplicate = await Student.findOne({
            _id: { $ne: student._id },
            $or: [
                ...(id ? [{ id }] : []),
                ...(email ? [{ email: email.toLowerCase() }] : [])
            ]
        });

        if (duplicate) {
            return res.status(409).json({
                success: false,
                message: "Student ID or email already exists"
            });
        }

        Object.assign(student, {
            id,
            name,
            gender,
            email,
            department,
            year
        });

        const updatedStudent = await student.save();

        res.status(200).json({
            success: true,
            message: "Student updated successfully",
            data: updatedStudent
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// 5. Delete student
const deleteStudent = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });
        }

        await student.deleteOne();

        res.status(200).json({
            success: true,
            message: "Student deleted successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Invalid student ID"
        });
    }
};

// Export all functions
module.exports = {
    getStudents,
    getStudent,
    createStudent,
    updateStudent,
    deleteStudent
};
