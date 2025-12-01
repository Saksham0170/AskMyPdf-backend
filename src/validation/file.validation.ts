import { z } from "zod";

export const UploadPdfSchema = z.object({
  params: z.object({
    chatId: z.string().uuid("Invalid chatId format"),
  }),
  body: z.object({}).optional(), // no body fields needed
});

export const GetPdfsSchema = z.object({
  params: z.object({
    chatId: z.string().uuid("Invalid chatId format"),
  }),
});

export const DeletePdfSchema = z.object({
  params: z.object({
    pdfId: z.string().uuid("Invalid pdfId format"),
  }),
});
