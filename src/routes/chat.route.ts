import express from "express";
import { requireAuth } from "@clerk/express";
import { getUserChats, createChat, getChatById } from "../controllers/chat.controller";
import { validate } from "../middlewares/validate";
import { GetChatByIdSchema } from "../validation/chat.validation";
const router = express.Router();

router.route("/")
    .get(requireAuth(), getUserChats)
    .post(requireAuth(), createChat);

router.route("/:id")
    .get(requireAuth(), validate(GetChatByIdSchema), getChatById);

export default router;
