import express from "express";
import errorHandler from "./middlewares/errorHandler";
import cors from "cors";
import fileRoutes from "./routes/file.route";
import { clerkMiddleware } from "@clerk/express";
import chatRoutes from "./routes/chat.route";
export const app = express();

app.use(cors({
  origin: "*", // Update with client URL in production
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true
}));

app.use(express.json());

app.use(clerkMiddleware());


// All routes
app.use("/api/files", fileRoutes);
app.use("/api/chat", chatRoutes);
app.use(errorHandler);