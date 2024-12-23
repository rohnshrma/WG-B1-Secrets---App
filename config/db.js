import mongoose from "mongoose";
export async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(conn.connection.host);
  } catch (err) {
    console.log("Error while connecting to DB", err);
  }
}
