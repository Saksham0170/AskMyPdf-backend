import express from "express";
import { uploadPdf, getPdfsForChat, deletePdf } from "../controllers/upload.controller";
import { uploadMiddleware, handleMulterError } from "../middlewares/upload.middleware";
import { requireAuth } from "@clerk/express";
import { UploadPdfSchema, GetPdfsSchema, DeletePdfSchema } from "../validation/upload.validation";
import { validate } from "../middlewares/validate";

const router = express.Router();

// Upload PDFs to a chat
router.route("/:chatId")
    .post(requireAuth(), validate(UploadPdfSchema), uploadMiddleware, handleMulterError, uploadPdf)
    .get(requireAuth(), validate(GetPdfsSchema), getPdfsForChat);

// Delete a specific PDF
router.route("/pdf/:pdfId")
    .delete(requireAuth(), validate(DeletePdfSchema), deletePdf);

export default router;
