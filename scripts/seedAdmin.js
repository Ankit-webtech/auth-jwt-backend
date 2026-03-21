import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

const seedAdmin = async () => {
  await mongoose.connect(process.env.MONGO_URI, { dbName: "auth-jwt" });
  
  const existing = await User.findOne({ email: "admin@example.com" });
  if (existing) {
    console.log("⚠️  Admin already exists — password reset kar raha hoon");
    const hashedPassword = await bcrypt.hash("Admin@12345", 10);
    await User.updateOne(
      { email: "admin@example.com" },
      { $set: { password: hashedPassword, role: "admin" } }
    );
    console.log("✅ Password reset ho gaya");
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash("Admin@12345", 10);
  await User.create({
    name: "Super Admin",
    email: "admin@example.com",
    password: hashedPassword,
    role: "admin",
  });

  console.log("✅ Admin bana diya — email: admin@example.com | pass: Admin@12345");
  process.exit(0);
};

seedAdmin().catch((err) => {
  console.error("❌ Failed:", err.message);
  process.exit(1);
});