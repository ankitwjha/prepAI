const mongoose = require("mongoose");

let isConnected = false;

async function connectToDB() {
    if (isConnected || mongoose.connection.readyState >= 1) {
        return;
    }

    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI environment variable is missing.");
        }

        const db = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
        });

        isConnected = !!db.connections[0].readyState;
        console.log("Connected to MongoDB Database");
    } catch (err) {
        console.error("MongoDB Connection Error:", err.message || err);
        throw err;
    }
}

module.exports = connectToDB;