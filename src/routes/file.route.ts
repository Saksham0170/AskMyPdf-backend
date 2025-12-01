import express from "express";
import { uploadPdf, getPdfsForChat, deletePdf } from "../controllers/file.controller";
import { uploadMiddleware, handleMulterError } from "../middlewares/upload.middleware";
import { requireAuth } from "@clerk/express";
import { UploadPdfSchema, GetPdfsSchema, DeletePdfSchema } from "../validation/file.validation";
import { validate } from "../middlewares/validate";

const router = express.Router();

// Upload PDFs to a chat
router.route("/upload/:chatId")
    .post(requireAuth(), validate(UploadPdfSchema), uploadMiddleware, handleMulterError, uploadPdf);

// Get all PDFs for a chat
router.route("/:chatId")
    .get(requireAuth(), validate(GetPdfsSchema), getPdfsForChat);

// Delete a specific PDF
router.route("/delete/:pdfId")
    .delete(requireAuth(), validate(DeletePdfSchema), deletePdf);

export default router;
