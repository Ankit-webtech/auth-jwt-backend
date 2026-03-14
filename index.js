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
if (!redisUrl) {
    console.error("REDIS_URL is not defined in .env file");
    process.exit(1);
}
export const redisClient = createClient({
    url: redisUrl,
});

redisClient.connect().then(() => console.log("connected to redis")).catch((err) => {
    console.error("Failed to connect to Redis", err.message);
    process.exit(1);
});

////// Server Setup
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cookieParser()); 
app.use(cors({
    origin: function(origin, callback) {
        const allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:5174',
            process.env.FRONTEND_URL,
        ];
        
        if(!origin) return callback(null, true);
        
        if(allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log("Blocked origin:", origin); // debug ke liye
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));


// Routes
import userRoute from "./routes/userRoute.js";
app.use("/api/v1", userRoute);

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 