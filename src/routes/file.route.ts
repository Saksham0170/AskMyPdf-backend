import express from "express";
import { generateUploadURLs, confirmUploads, getPdfsForChat, deletePdf, getSignedUrl, getPdfStatus } from "../controllers/file.controller";
import { requireAuth } from "@clerk/express";
import { GetPdfsSchema, DeletePdfSchema, GenerateUploadURLsSchema, ConfirmUploadsSchema, GetSignedUrlSchema, GetPdfStatusSchema } from "../validation/file.validation";
import { validate } from "../middlewares/validate";
import { uploadRateLimiter } from "../middlewares/rateLimiter";

const router = express.Router();

// Generate upload URLs for files
router.route("/:chatId/upload-urls")
    .post(requireAuth(), uploadRateLimiter, validate(GenerateUploadURLsSchema), generateUploadURLs);

// Confirm file uploads
router.route("/:chatId/confirm-uploads")
    .post(requireAuth(), validate(ConfirmUploadsSchema), confirmUploads);

// Get all PDFs for a chat
router.route("/:chatId")
    .get(requireAuth(), validate(GetPdfsSchema), getPdfsForChat);

// Get PDF status (accepts comma-separated IDs, max 3)
router.route("/status/:pdfIds")
    .get(requireAuth(), validate(GetPdfStatusSchema), getPdfStatus);

// Delete a specific PDF
router.route("/delete/:pdfId")
    .delete(requireAuth(), validate(DeletePdfSchema), deletePdf);

// Get signed URL to access a PDF
router.route("/access/:pdfId")
    .get(requireAuth(), validate(GetSignedUrlSchema), getSignedUrl);

export default router;
