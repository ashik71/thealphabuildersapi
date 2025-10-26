import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import projectRoutes from "./routes/project.routes.js";
import bcrypt from 'bcryptjs';
import User from "./models/user.model.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);

const createAdmin = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const hashed = await bcrypt.hash('admin123', 10);

  const user = new User({
    username: 'admin',
    password: hashed,
    role: 'admin'
  });

  await user.save();
  console.log('✅ Admin user created');
  process.exit(0);
};

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    console.log('Connected to MongoDB database:', mongoose.connection.db.databaseName);

    app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));
  })
  .catch(err => console.error(err));
//createAdmin();
