import { Queue } from "bullmq";
import { redisConfig } from "../config/redis";

export const fileUploadQueue = new Queue("fileUploadQueue", {
  connection: redisConfig,
});