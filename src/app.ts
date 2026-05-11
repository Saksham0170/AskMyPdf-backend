import express from "express";
import errorHandler from "./middlewares/errorHandler";
import cors from "cors";
import fileRoutes from "./routes/file.route";
import { clerkMiddleware } from "@clerk/express";
import chatRoutes from "./routes/chat.route";
import { generalRateLimiter } from "./middlewares/rateLimiter";
import { prisma } from "./lib/prisma";
import redis from "./config/redis";
import { supabase, supabaseUploadsBucket } from "./config/supabase";
export const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true
}));

app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    const { error } = await supabase.storage
      .from(supabaseUploadsBucket)
      .list("", { limit: 1 });

    if (error) {
      throw error;
    }

    return res.json({
      ok: true,
      timestamp: Date.now(),
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      timestamp: Date.now(),
    });
  }
});

app.use(clerkMiddleware());
app.use(generalRateLimiter);


// All routes
app.use("/api/files", fileRoutes);
app.use("/api/chat", chatRoutes);
app.use(errorHandler);