import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getAuth } from "@clerk/express";
import { fileService } from "../services/file.service";
import { chatService } from "../services/chat.service";
import { MAX_FILES, MAX_PDF_SIZE } from "../constants";

//@desc Upload PDF files to a chat
//@route POST /api/upload/:chatId
//@access private
const uploadPdf = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    const { chatId } = req.params;

    if (!userId) {
        console.log("Unauthorized access attempt");
        res.status(401);
        throw new Error("Unauthorized");
    }
    console.log(`User ${userId} is uploading files to chat ${chatId}`);

    // Verify chat belongs to user
    const chat = await chatService.getChatById(userId, chatId);
    if (!chat) {
        res.status(404);
        console.log(`Chat ${chatId} not found or unauthorized for user ${userId}`);
        throw new Error("Chat not found or unauthorized");
    }

    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
        console.log(`No files uploaded by user ${userId} to chat ${chatId}`);
        res.status(400);
        throw new Error('No files uploaded');
    }

    const files = req.files as Express.Multer.File[];

    // Validate file sizes
    for (const file of files) {
        if (file.size > MAX_PDF_SIZE) {
            res.status(400);
            throw new Error(`File ${file.originalname} exceeds ${MAX_PDF_SIZE / (1024 * 1024)}MB limit`);
        }
    }

    // Check total PDFs in chat
    const existingPdfs = await fileService.getPdfsByChatId(chatId);
    const totalPdfsAfterUpload = existingPdfs.length + files.length;

    if (totalPdfsAfterUpload > MAX_FILES) {
        res.status(400);
        throw new Error(`Maximum ${MAX_FILES} PDFs allowed per chat. Current: ${existingPdfs.length}, Uploading: ${files.length}`);
    }

    const pdfRecords = await fileService.uploadFile(chatId, files);

    res.status(200).json({
        success: true,
        message: `${files.length} file(s) uploaded successfully`,
        data: {
            count: files.length,
            pdfs: pdfRecords
        }
    });
});

//@desc Get all PDFs for a chat
//@route GET /api/upload/:chatId
//@access private
const getPdfsForChat = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    const { chatId } = req.params;

    if (!userId) {
        res.status(401);
        throw new Error("Unauthorized");
    }

    // Verify chat belongs to user
    const chat = await chatService.getChatById(userId, chatId);
    if (!chat) {
        res.status(404);
        throw new Error("Chat not found or unauthorized");
    }

    const pdfs = await fileService.getPdfsByChatId(chatId);

    res.status(200).json({
        success: true,
        data: {
            count: pdfs.length,
            pdfs
        }
    });
});

//@desc Delete a PDF
//@route DELETE /api/upload/pdf/:pdfId
//@access private
const deletePdf = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    const { pdfId } = req.params;

    if (!userId) {
        res.status(401);
        throw new Error("Unauthorized");
    }

    // Get PDF and verify it belongs to a chat owned by the user
    const pdf = await fileService.getPdfById(pdfId);
    if (!pdf) {
        res.status(404);
        throw new Error("PDF not found");
    }

    const chat = await chatService.getChatById(userId, pdf.chatId);
    if (!chat) {
        res.status(403);
        throw new Error("Unauthorized to delete this PDF");
    }

    const deletedPdf = await fileService.deletePdf(pdfId);

    res.status(200).json({
        success: true,
        message: 'PDF deleted successfully',
        data: deletedPdf
    });
});

export { uploadPdf, getPdfsForChat, deletePdf };