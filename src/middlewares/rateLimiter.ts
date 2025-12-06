import { Request, Response, NextFunction } from "express";
import { RateLimiterRedis } from "rate-limiter-flexible";
import redis from "../config/redis";
import { getAuth } from "@clerk/express";

// Rate limiter for general API requests (100 requests per 15 minutes per IP)
const rateLimiterGeneral = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: "rl:general",
    points: 100, // Number of requests
    duration: 15 * 60, // Per 15 minutes
});

// Rate limiter for AI requests (20 requests per day per user)
const rateLimiterAI = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: "rl:ai",
    points: 20,
    duration: 24 * 60 * 60,
});

// Rate limiter for file uploads (3 uploads per day per user)
const rateLimiterUpload = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: "rl:upload",
    points: 3,
    duration: 24 * 60 * 60,
});

export const generalRateLimiter = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const key = req.ip || req.socket.remoteAddress || "unknown";
        await rateLimiterGeneral.consume(key);
        next();
    } catch (error) {
        res.status(429).json({
            success: false,
            message: "Too many requests. Please try again later.",
        });
    }
};

export const aiRateLimiter = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { userId } = getAuth(req);
        const key = userId || req.ip || "unknown";
        await rateLimiterAI.consume(key);
        next();
    } catch (error) {
        res.status(429).json({
            success: false,
            message: "Too many AI requests. Please try again later.",
        });
    }
};

export const uploadRateLimiter = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { userId } = getAuth(req);
        const key = userId || req.ip || "unknown";
        await rateLimiterUpload.consume(key);
        next();
    } catch (error) {
        res.status(429).json({
            success: false,
            message: "Upload limit reached. Please try again later.",
        });
    }
};
