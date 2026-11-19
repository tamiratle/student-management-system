
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const readline = require("readline");
require("dotenv").config();

const Admin = require("./models/Admin");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
}

async function resetAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("Connected to MongoDB.");

        const username = (
            await ask("Enter your new administrator username: ")
        ).trim();

        const password = await ask(
            "Enter your new administrator password: "
        );

        if (!username || !password) {
            throw new Error("Username and password are required.");
        }

        if (password.length < 8) {
            throw new Error(
                "Password must contain at least 8 characters."
            );
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const admin = await Admin.findOneAndUpdate(
            {},
            {
                $set: {
                    username: username,
                    password: hashedPassword
                }
            },
            {
                new: true,
                sort: { createdAt: 1 }
            }
        );

        if (admin) {
            console.log("Administrator account updated successfully!");
        } else {
            await Admin.create({
                username,
                password: hashedPassword
            });

            console.log("New administrator account created successfully!");
        }

    } catch (error) {
        console.error("Error:", error.message);

    } finally {
        rl.close();
        await mongoose.disconnect();
    }
}

resetAdmin();
