require("dotenv").config();
const app = require("../src/app");
const connectToDB = require("../src/config/database");

module.exports = async (req, res) => {
    try {
        await connectToDB();
    } catch (err) {
        console.error("Vercel Serverless DB Connection Failed:", err);
        return res.status(500).json({
            message: err.message || "Database connection failed. Ensure 0.0.0.0/0 IP access is enabled in MongoDB Atlas Network Access."
        });
    }
    return app(req, res);
};
