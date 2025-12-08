import { z } from "zod";

export const GenerateUploadURLsSchema = z.object({
  params: z.object({
    chatId: z.string().uuid("Invalid chatId format"),
  }),
  body: z.object({
    fileNames: z
      .array(z.string().min(1, "File name cannot be empty"))
      .min(1, "At least one file is required")
      .max(10, "Maximum 10 files allowed"),
  }),
});

export const ConfirmUploadsSchema = z.object({
  params: z.object({
    chatId: z.string().uuid("Invalid chatId format"),
  }),
  body: z.object({
    uploads: z
      .array(
        z.object({
          fileName: z.string().min(1, "File name is required"),
          path: z.string().min(1, "File path is required"),
        })
      )
      .min(1, "At least one upload is required")
      .max(10, "Maximum 10 uploads allowed"),
  }),
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

export const GetSignedUrlSchema = z.object({
  params: z.object({
    pdfId: z.string().uuid("Invalid pdfId format"),
  }),
});

export const GetPdfStatusSchema = z.object({
  params: z.object({
    pdfIds: z
      .string()
      .min(1, "At least one PDF ID is required")
      .refine(
        (value) => {
          const ids = value.split(',').map(id => id.trim()).filter(Boolean);
          return ids.length > 0 && ids.length <= 3;
        },
        { message: "Provide between 1 and 3 comma-separated PDF IDs" }
      )
      .refine(
        (value) => {
          const ids = value.split(',').map(id => id.trim()).filter(Boolean);
          return ids.every(id => z.string().uuid().safeParse(id).success);
        },
        { message: "All PDF IDs must be valid UUIDs" }
      ),
  }),
});
