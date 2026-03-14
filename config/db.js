import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();




const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.warn("⚠️ MONGO_URI not defined - running without MongoDB");
      return;
    }
    await mongoose.connect(process.env.MONGO_URI, {
        dbName: 'auth-jwt',
    });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.warn("⚠️ Failed to connect to MongoDB:", err.message);
    console.warn("⚠️ Continuing without MongoDB...");
  }
};

export default connectDB;