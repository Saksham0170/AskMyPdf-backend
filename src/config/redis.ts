import Redis from "ioredis";

export const redisConfig = {
  username: process.env.REDIS_USERNAME ?? "default",
  password: process.env.REDIS_PASSWORD,
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT ?? "17938", 10),
};

const redis = new Redis(redisConfig);
redis.on("connect", () => {
  console.log("Redis connected");
});

redis.on("error", (err) => {
  console.error("Redis error", err);
});

export default redis;
