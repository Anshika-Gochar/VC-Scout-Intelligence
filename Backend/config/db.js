import mongoose from "mongoose";
import logger from "../utils/logger.js";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info("MongoDB connected successfully");
  } catch (err) {
    // Log a safe message — never log the raw URI (contains credentials)
    logger.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
};

export default connectDB;