const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const tokenBlackListModel = require("../models/blacklist.model");

const JWT_SECRET = process.env.JWT_SECRET || "prep_ai_default_fallback_jwt_secret_key_2026";

/**
 * @name registerUserController
 * @description register a new user, expects username, email and password
 * @access public
 */
async function registerUserController(req, res) {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                message: "Please provide username, email and password"
            });
        }

        const cleanUsername = username.trim();
        const cleanEmail = email.trim().toLowerCase();

        const isUserAlreadyExists = await userModel.findOne({
            $or: [
                { username: new RegExp("^" + cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", "i") },
                { email: cleanEmail }
            ]
        });

        if (isUserAlreadyExists) {
            return res.status(400).json({
                message: "Account already exists with this username or email"
            });
        }

        const hash = await bcrypt.hash(password, 10);

        const user = await userModel.create({
            username: cleanUsername,
            email: cleanEmail,
            password: hash
        });

        const token = jwt.sign(
            { id: user._id, username: user.username },
            JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000,
        });

        return res.status(201).json({
            message: "User registered successfully",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (err) {
        console.error("Register controller error:", err);
        if (err.code === 11000) {
            return res.status(400).json({
                message: "Account already exists with this username or email"
            });
        }
        return res.status(500).json({
            message: err.message || "Registration failed due to server error"
        });
    }
}

/**
 * @name loginUserController
 * @description login a user, accepts email or username and password
 * @access public   
 */
async function loginUserController(req, res) {
    try {
        const { email, username, password } = req.body;
        const identifier = (email || username || "").trim();

        if (!identifier || !password) {
            return res.status(400).json({
                message: "Please provide email/username and password"
            });
        }

        const user = await userModel.findOne({
            $or: [
                { email: identifier.toLowerCase() },
                { username: identifier },
                { email: new RegExp("^" + identifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", "i") },
                { username: new RegExp("^" + identifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", "i") }
            ]
        });

        if (!user) {
            return res.status(400).json({
                message: "Invalid email/username or password"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(400).json({
                message: "Invalid email/username or password"
            });
        }

        const token = jwt.sign(
            { id: user._id, username: user.username },
            JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
            message: "User logged in successfully",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (err) {
        console.error("Login controller error:", err);
        return res.status(500).json({
            message: err.message || "Login failed due to server error"
        });
    }
}

/**
 * @name logoutUserController
 * @description clear token from user cookies and add token to blacklist collection 
 * @access public
 */
async function logoutUserController(req, res) {
    try {
        const token = req.cookies?.token;

        if (token) {
            await tokenBlackListModel.create({ token });
        }
        res.clearCookie("token");

        return res.status(200).json({
            message: "User logged out successfully"
        });
    } catch (err) {
        console.error("Logout error:", err);
        res.clearCookie("token");
        return res.status(200).json({
            message: "User logged out"
        });
    }
}

/**
 * @name getMeController
 * @description get the current logged in user details
 * @access private
 */
async function getMeController(req, res) {
    try {
        const user = await userModel.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.status(200).json({
            message: "User details fetched successfully",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (err) {
        console.error("getMe error:", err);
        return res.status(500).json({
            message: "Failed to fetch user details"
        });
    }
}

module.exports = {
    registerUserController,
    loginUserController,
    logoutUserController,
    getMeController
};

