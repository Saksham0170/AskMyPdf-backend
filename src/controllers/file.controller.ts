import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getAuth } from "@clerk/express";
import { fileService } from "../services/file.service";
import { chatService } from "../services/chat.service";

// @desc Generate upload URLs for files
// @route POST /api/files/:chatId/upload-urls
// @access private
export const generateUploadURLs = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuth(req);

    if (!userId) {
        res.status(401);
        throw new Error("Unauthorized");
    }

    const { chatId } = req.params;
    const { fileNames } = req.body as { fileNames: string[] };

    const uploadData = await fileService.generateUploadURLs(userId, chatId, fileNames);
    res.json(uploadData);
});

// @desc Confirm file uploads
// @route POST /api/files/:chatId/confirm-uploads
// @access private
export const confirmUploads = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuth(req);

    if (!userId) {
        res.status(401);
        throw new Error("Unauthorized");
    }

    const { chatId } = req.params;
    const { uploads } = req.body as { uploads: Array<{ fileName: string; path: string }> };

    const pdfRecords = await fileService.confirmUploads(userId, chatId, uploads);
    res.json(pdfRecords);
});

//@desc Get all PDFs for a chat
//@route GET /api/files/:chatId
//@access private
export const getPdfsForChat = asyncHandler(async (req: Request, res: Response) => {
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
//@route DELETE /api/files/delete/:pdfId
//@access private
export const deletePdf = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    const { pdfId } = req.params;

    if (!userId) {
        res.status(401);
        throw new Error("Unauthorized");
    }

    const result = await fileService.deletePdf(userId, pdfId);

    res.status(200).json({
        success: true,
        message: 'PDF deleted successfully',
        data: result
    });
});

//@desc Get signed URL to access/download a PDF
//@route GET /api/files/access/:pdfId
//@access private
export const getSignedUrl = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    const { pdfId } = req.params;

    if (!userId) {
        res.status(401);
        throw new Error("Unauthorized");
    }

    const result = await fileService.getSignedUrl(userId, pdfId);

    res.status(200).json({
        success: true,
        data: result
    });
});