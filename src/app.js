const express = require ("express")
const cookieParser=require("cookie-parser")
const cors= require("cors")

const app=express()

app.use(express.json())
app.use(cookieParser())
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
            callback(null, true);
        } else {
            callback(null, true);
        }
    },
    credentials: true
}))

//require all the routes here
const authRouter=require("./routes/auth.routes")
const interviewRouter = require ("./routes/interview.routes")


//using all the routes here (supporting both /api and direct serverless paths)
app.use(["/api/auth", "/auth"], authRouter)
app.use(["/api/interview", "/interview"], interviewRouter)

// Global error handler for serverless functions
app.use((err, req, res, next) => {
    console.error("Uncaught Express Error:", err);
    res.status(500).json({
        message: err.message || "An internal server error occurred"
    });
});

module.exports=app