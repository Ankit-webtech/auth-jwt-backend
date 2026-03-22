import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import { createClient } from "redis";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

//// Load env
dotenv.config();

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 5000;
const redisUrl = process.env.REDIS_URL;

///// Export Redis client
export let redisClient = null;

// /===== Middleware =====
app.use(helmet());                              ///// Security headers — sabse pehle

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ===== CORS Configuration =====
// const allowedOrigins = process.env.NODE_ENV === "production"
//   ? [process.env.FRONTEND_URL]
//   : ["http://localhost:5173", "http://localhost:5174"];

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       // allow requests with no origin (like Postman)
//       if (!origin || allowedOrigins.includes(origin)) {
//         callback(null, true);
//       } else {
//         callback(new Error("Not allowed by CORS"));
//       }
//     },
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//   })
// );

const allowedOrigins = process.env.NODE_ENV === "production"
  ? [
      process.env.FRONTEND_URL,
      process.env.FRONTEND_URL?.replace(/\/$/, ""), // trailing slash remove
    ].filter(Boolean)
  : ["http://localhost:5173", "http://localhost:5174"];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Debug ke liye log karo — baad mein hatayenge
      // console.log("CORS blocked origin:", origin);
      // console.log("Allowed origins:", allowedOrigins);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));


////// rate limiting ========
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }, 
  message: { message: "Too many requests. Please try again later." },
});
app.use("/api/", globalLimiter);

// ===== Routes =====
import userRoute from "./routes/userRoute.js";

app.get("/", (req, res) => {
  res.json({ message: "Auth JWT Backend is running" });
});

app.use("/api/v1", userRoute);

// ===== Start Server Function =====
async function startServer() {
  try {
    // Connect MongoDB
    await connectDB();
    console.log("✅ MongoDB connected");

    ///// Connect Redis (optional)
    if (redisUrl) {
      try {
        redisClient = createClient({ url: redisUrl });
        await redisClient.connect();
        console.log("✅ Connected to Redis");
      } catch (err) {
        console.warn("⚠️ Redis failed:", err.message);
        redisClient = null;
      }
    }

    //// Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("❌ Server failed:", error);
    process.exit(1);
  }
}

/////////// Start app
startServer();



///✅ MongoDB connected || ✅ Connected to Redis || 🚀 Server running on port 5000
