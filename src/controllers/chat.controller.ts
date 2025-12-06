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

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  const result = await chatService.getUserChats(userId, page, limit);
  res.json(result);
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
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;

  const chat = await chatService.getChatById(userId, chatId, page, limit);

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
  const question: string = req.body.question;
  const answer = await chatService.askQuestion(userId, chatId, question);
  res.json(answer);
});
