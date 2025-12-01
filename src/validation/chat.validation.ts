import { z } from "zod";

const AskQuestionSchema = z.object({
  params: z.object({
    chatId: z.string().uuid("Invalid chatId format"),
  }),
  body: z.object({
    question: z.string().min(1, "Question cannot be empty"),
  }),
});

const GetChatByIdSchema = z.object({
  params: z.object({
    chatId: z.string().uuid("Invalid chatId format"),
  }),
});

export { AskQuestionSchema, GetChatByIdSchema };