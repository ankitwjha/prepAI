require("dotenv").config();
const app = require("../src/app");
const connectToDB = require("../src/config/database");

module.exports = async (req, res) => {
    try {
        await connectToDB();
        return app(req, res);
    } catch (err) {
        console.error("Vercel Serverless Function Error:", err);
        return res.status(500).json({
            message: err.message || String(err) || "Internal Server Error"
        });
    }
};
