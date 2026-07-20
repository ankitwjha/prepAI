require("dotenv").config();
const app = require("../src/app");
const connectToDB = require("../src/config/database");

let isDbConnected = false;

module.exports = async (req, res) => {
    if (!isDbConnected) {
        try {
            await connectToDB();
            isDbConnected = true;
        } catch (err) {
            console.error("MongoDB Serverless Connection Error:", err);
        }
    }
    return app(req, res);
};
