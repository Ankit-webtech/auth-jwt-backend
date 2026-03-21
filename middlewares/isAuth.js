import jwt from "jsonwebtoken";
import { redisClient } from "../index.js";
import User from "../models/User.js";
import { isSessionActive } from "../config/generateToken.js";

export const isAuth = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;
    if (!token) {
      return res.status(403).json({
        message: "Please Login - no token ",
      });
    }
    const decodedData = jwt.verify(token, process.env.JWT_SECRET);

    if (!decodedData) {
      return res.status(400).json({
        message: "Token expired!",
      });
    }

    const sessionActive = await isSessionActive(
      decodedData.id,
      decodedData.sessionId,
    )
    if(!sessionActive){
      res.clearCookie("refreshToken");
       res.clearCookie("accessToken");
        res.clearCookie("csrfToken");

        return res.status(401).json({
          message:"Session Expired. You have been logged in another device",
        })
    }

    // Check Redis Cache first
const cacheUser = redisClient ? await redisClient.get(`user:${decodedData.id}`) : null;
if (cacheUser) {
  req.user = JSON.parse(cacheUser);
  req.sessionId = decodedData.sessionId;
  return next();
}

const user = await User.findById(decodedData.id).select("-password"); // ← declare FIRST

if (!user) {
  return res.status(400).json({ message: "No user with this id" });
}

if (redisClient) {         // ← THEN cache
  await redisClient.setEx(`user:${user._id}`, 3600, JSON.stringify(user));
}

req.user = user;
req.sessionId = decodedData.sessionId;
next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(403).json({ message: "Token expired" });
    }
    return res.status(500).json({ message: error.message });
  }
};

/////// temporarily
export const authorizedAdmin = async(req, res, next) => {
  const user = req.user;
  if(user.role !== 'admin'){
    return res.status(401).json({ message: "You are not allowed for this activity" });
  }
  next();
};

/////////// New flexible 
export const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required role: ${roles.join(' or ')}`,
        code: "INSUFFICIENT_ROLE",
      });
    }
    next();
  };
};