import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import projectRoutes from "./routes/project.routes.js";
import costCategoryRoutes from "./routes/costCategory.routes.js";
import expenseRoutes from "./routes/expense.routes.js";
import shareholderRoutes from "./routes/shareholder.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import shareholderCommitmentRoutes from "./routes/shareholderCommitment.routes.js";
import invitationRoutes from "./routes/invitation.routes.js";
import meRoutes from "./routes/me.routes.js";
import { getFrontendUrl } from "./utils/frontendUrl.js";

dotenv.config();
const app = express();

// Only the portal may call this API from a browser. Requests with no Origin
// (the Flutter app, curl, server-to-server) are allowed — the browser
// same-origin policy is what CORS constrains, and native clients are still
// gated by the auth middleware.
const allowedOrigins = new Set(
  [
    getFrontendUrl(),
    ...(process.env.ALLOWED_ORIGINS || "").split(",").map((o) => o.trim()),
    "http://localhost:4200",
  ].filter(Boolean)
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
  })
);
app.use(express.json({ limit: "1mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/cost-categories", costCategoryRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/shareholders", shareholderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/commitments", shareholderCommitmentRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/me", meRoutes);

// Last-resort handler: log the detail, return a generic message. Stack traces
// and driver errors must never reach a client.
app.use((err, _req, res, _next) => {
  console.error(err);
  if (res.headersSent) return;
  res.status(500).json({ message: "Something went wrong" });
});


mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    console.log(
      "Connected to MongoDB database:",
      mongoose.connection.db.databaseName
    );

    app.listen(process.env.PORT, () =>
      console.log(`Server running on port ${process.env.PORT}`)
    );
  })
  .catch((err) => console.error(err));
//createAdmin();
