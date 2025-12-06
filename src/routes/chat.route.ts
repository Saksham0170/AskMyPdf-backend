import express from "express";
import { requireAuth } from "@clerk/express";
import { getUserChats, createChat, getChatById, askQuestion } from "../controllers/chat.controller";
import { validate } from "../middlewares/validate";
import { AskQuestionSchema, GetChatByIdSchema } from "../validation/chat.validation";
import { aiRateLimiter } from "../middlewares/rateLimiter";
const router = express.Router();

router.route("/")
    .get(requireAuth(), getUserChats)
    .post(requireAuth(), createChat);

router.route("/:chatId")
    .get(requireAuth(), validate(GetChatByIdSchema), getChatById)

router.route("/:chatId/question")
    .post(requireAuth(), aiRateLimiter, askQuestion);
export default router;
