import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getAuth } from "@clerk/express";
import { chatService } from "../services/chat.service";

// @desc Create new chat
// @route POST /api/chat
// @access private
export const createChat = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = getAuth(req);

  if (!userId) {
    res.status(401);
    throw new Error("Unauthorized");
  }

  const chat = await chatService.createChat(userId);
  res.json({ chatId: chat.id });
});

// @desc Get all user chats
// @route GET /api/chats
// @access private
export const getUserChats = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = getAuth(req);

  if (!userId) {
    res.status(401);
    throw new Error("Unauthorized");
  }

  const chats = await chatService.getUserChats(userId);
  res.json(chats);
});

// @desc Get chat by ID
// @route GET /api/chat/:chatId
// @access private
export const getChatById = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = getAuth(req);

  if (!userId) {
    res.status(401);
    throw new Error("Unauthorized");
  }

  const { chatId } = req.params;

  const chat = await chatService.getChatById(userId, chatId);

  if (!chat) {
    res.status(404);
    throw new Error("Chat not found");
  }

  res.json(chat);
});

// @desc Ask question in chat
// @route POST /api/chat/:chatId/question
// @access private
export const askQuestion = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = getAuth(req);

  if (!userId) {
    res.status(401);
    throw new Error("Unauthorized");
  }

  const { chatId } = req.params;

  const chat = await chatService.getChatById(userId, chatId);

  if (!chat) {
    res.status(404);
    throw new Error("Chat not found");
  }

  //TODO: Implement ask question logic
});
