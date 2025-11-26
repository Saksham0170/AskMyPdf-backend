import express from "express";
import errorHandler from "./middlewares/errorHandler";
import cors from "cors";
import uploadRoutes from "./routes/uploadRoutes";
import { clerkMiddleware } from "@clerk/express";

export const app = express();

app.use(cors({
  origin: "*", // Update with client URL in production
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true
}));

app.use(express.json());

app.use(clerkMiddleware());


// All routes
app.use("/api/upload", uploadRoutes);
app.use(errorHandler);