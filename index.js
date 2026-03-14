import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import {createClient} from "redis";
import cookieParser from "cookie-parser"; 
import cors from 'cors';


const app = express();
app.use(express.urlencoded({ extended: true }))
dotenv.config();

await connectDB();


////// Redis Client Setup
const redisUrl = process.env.REDIS_URL;
export let redisClient = null;

if (redisUrl) {
    redisClient = createClient({
        url: redisUrl,
    });

    redisClient.connect()
        .then(() => console.log("✅ Connected to Redis"))
        .catch((err) => {
            console.warn("⚠️ Redis connection failed:", err.message);
            console.warn("⚠️ Continuing without Redis...");
            redisClient = null;
        });
} else {
    console.warn("⚠️ REDIS_URL not defined - running without Redis");
}

////// Server Setup
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cookieParser()); 
// app.use(cors({
//     origin: [
//         'http://localhost:5173',
//         'http://localhost:5174',
//         'https://authjwtfrontend.vercel.app',
//         'https://authjwtfrontend-git-main-ankit-webtechs-projects.vercel.app',
//     ],
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
// }));


app.use(cors({
  origin: "https://authjwtfrontend.vercel.app",
  credentials: true
}));

// Root route
app.get("/", (req, res) => {
  res.json({ message: "Auth JWT Backend is running" });
});

// Routes
import userRoute from "./routes/userRoute.js";
app.use("/api/v1", userRoute);

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 
