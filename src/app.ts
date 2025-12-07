import express from "express";
import errorHandler from "./middlewares/errorHandler";
import cors from "cors";
import fileRoutes from "./routes/file.route";
import { clerkMiddleware } from "@clerk/express";
import chatRoutes from "./routes/chat.route";
import { generalRateLimiter } from "./middlewares/rateLimiter";
export const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true
}));

app.use(express.json());

app.use(clerkMiddleware());
app.use(generalRateLimiter);


// All routes
app.use("/api/files", fileRoutes);
app.use("/api/chat", chatRoutes);
app.use(errorHandler);