import { Request, Response, NextFunction } from "express";
import { RateLimiterRedis } from "rate-limiter-flexible";
import redis from "../config/redis";
import { getAuth } from "@clerk/express";

// Rate limiter for general API requests (100 requests per minute per IP)
const rateLimiterGeneral = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: "rl:general",
    points: 100, // Number of requests
    duration: 60, // Per 1 minute
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
        const { userId } = getAuth(req);
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        await rateLimiterGeneral.consume(userId);
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
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        await rateLimiterAI.consume(userId);
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
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        await rateLimiterUpload.consume(userId);
        next();
    } catch (error) {
        res.status(429).json({
            success: false,
            message: "Upload limit reached. Please try again later.",
        });
    }
};
