import mongoose from "mongoose";

export const connectDatabase = async () => {
  if (!process.env.MONGO_URI) {
    console.warn("MONGO_URI not set, using memory store for demo data");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME || "enthuai_qa",
      serverSelectionTimeoutMS: 5000
    });
    console.log("MongoDB connected");
  } catch (error) {
    console.warn("MongoDB unavailable, using memory store", error.message);
  }
};
