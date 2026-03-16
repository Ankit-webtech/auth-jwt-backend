import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import {createClient} from "redis";
import cookieParser from "cookie-parser"; 
import cors from 'cors';



dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser()); 
// cors
app.use(cors({
  origin: function(origin, callback) {
   const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://authjwtfrontend.vercel.app',
  'https://auth-jwtfrontend.vercel.app',     
  'https://auth-jwt-frontend.vercel.app',      
];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));

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




///// Root route
app.get("/", (req, res) => {
  res.json({ message: "Auth JWT Backend is running" });
});



/////// Routes
import userRoute from "./routes/userRoute.js";
app.use("/api/v1", userRoute);




///////// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 
