const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const tokenBlackListModel = require("../models/blacklist.model");
const sendEmail = require("../utils/sendEmail");

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

        // Generate a 6-digit numeric OTP code
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        const user = await userModel.create({
            username: cleanUsername,
            email: cleanEmail,
            password: hash,
            isVerified: false,
            otp: otpCode,
            otpExpires
        });

        // Send OTP email
        await sendEmail({
            to: cleanEmail,
            subject: "Verify your PrepAI Account",
            text: `Welcome to PrepAI! Your verification OTP code is: ${otpCode}. It will expire in 5 minutes.`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px; max-width: 600px;">
                    <h2 style="color: #1e295d;">Verify your PrepAI Account</h2>
                    <p>Welcome to PrepAI! Use the verification code below to activate your account:</p>
                    <div style="background-color: #f1f5f9; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; color: #1d4ed8;">
                        ${otpCode}
                    </div>
                    <p style="font-size: 12px; color: #666;">This verification code is valid for 5 minutes. If you did not request this, you can safely ignore this email.</p>
                </div>
            `
        });

        return res.status(201).json({
            message: "Verification OTP code sent to your email",
            email: user.email
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

        if (!user.isVerified) {
            return res.status(403).json({
                message: "Please verify your email address before logging in.",
                email: user.email
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

/**
 * @name verifyOtpController
 * @description Verify candidate email registration via OTP code
 * @access public
 */
async function verifyOtpController(req, res) {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                message: "Email and OTP code are required"
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        const user = await userModel.findOne({ email: cleanEmail });

        if (!user) {
            return res.status(404).json({
                message: "User not found with this email"
            });
        }

        if (user.isVerified) {
            return res.status(400).json({
                message: "Email is already verified. Please sign in."
            });
        }

        // Verify expiration
        if (user.otpExpires < Date.now()) {
            return res.status(400).json({
                message: "OTP code has expired. Please request a new code."
            });
        }

        // Match check
        if (user.otp !== otp.trim()) {
            return res.status(400).json({
                message: "Invalid OTP code"
            });
        }

        // Mark as verified
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        // Automatically log user in upon successful verification
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
            message: "Email verified and logged in successfully",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (err) {
        console.error("Verify OTP error:", err);
        return res.status(500).json({
            message: "OTP verification failed due to server error"
        });
    }
}

/**
 * @name resendOtpController
 * @description Generate and resend a new OTP verification code
 * @access public
 */
async function resendOtpController(req, res) {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required to resend OTP"
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        const user = await userModel.findOne({ email: cleanEmail });

        if (!user) {
            return res.status(404).json({
                message: "User not found with this email"
            });
        }

        if (user.isVerified) {
            return res.status(400).json({
                message: "Email is already verified. Please sign in."
            });
        }

        // Generate new OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

        user.otp = otpCode;
        user.otpExpires = otpExpires;
        await user.save();

        // Send Email
        await sendEmail({
            to: cleanEmail,
            subject: "Verify your PrepAI Account - New Code",
            text: `Your new PrepAI verification OTP code is: ${otpCode}. It will expire in 5 minutes.`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px; max-width: 600px;">
                    <h2 style="color: #1e295d;">New Verification Code</h2>
                    <p>Use the verification code below to activate your PrepAI account:</p>
                    <div style="background-color: #f1f5f9; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; color: #1d4ed8;">
                        ${otpCode}
                    </div>
                    <p style="font-size: 12px; color: #666;">This verification code is valid for 5 minutes. If you did not request this, you can safely ignore this email.</p>
                </div>
            `
        });

        return res.status(200).json({
            message: "New verification OTP code sent successfully",
            email: user.email
        });
    } catch (err) {
        console.error("Resend OTP error:", err);
        return res.status(500).json({
            message: "Failed to resend OTP code due to server error"
        });
    }
}

module.exports = {
    registerUserController,
    loginUserController,
    logoutUserController,
    getMeController,
    verifyOtpController,
    resendOtpController
};

