import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URL || process.env.MONGO_URI;

    if (!uri) {
      console.warn("⚠️ No MongoDB URI found - running without MongoDB");
      return;
    }

    await mongoose.connect(uri, {
      dbName: 'auth-jwt',
    });

  } catch (err) {
    console.warn("⚠️ Failed to connect to MongoDB:", err.message);
    console.warn("⚠️ Continuing without MongoDB...");
  }
};

export default connectDB;