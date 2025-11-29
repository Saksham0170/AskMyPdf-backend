import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { uploadService } from "../services/upload.service";
import { MAX_FILES, MAX_PDF_SIZE } from "../constants";
import fs from "fs";
import path from "path";

//@desc Upload PDF files to a chat
//@route POST /api/upload/:chatId
//@access private
const uploadPdf = asyncHandler(async (req: Request, res: Response) => {
    const { chatId } = req.params;

    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
        res.status(400);
        throw new Error('No files uploaded');
    }

    const files = req.files as Express.Multer.File[];

    // Check total PDFs in chat
    const existingPdfs = await uploadService.getPdfsByChatId(chatId);
    const totalPdfsAfterUpload = existingPdfs.length + files.length;

    if (totalPdfsAfterUpload > MAX_FILES) {
        res.status(400);
        throw new Error(`Maximum ${MAX_FILES} PDFs allowed per chat. Current: ${existingPdfs.length}, Uploading: ${files.length}`);
    }

    for (const file of files) {
        if (file.size > MAX_PDF_SIZE) {
            throw new Error(`File ${file.originalname} exceeds ${MAX_PDF_SIZE / (1024 * 1024)}MB limit`);
        }
    }

    const pdfRecords = await uploadService.uploadFile(chatId, files);

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
    const { chatId } = req.params;

    const pdfs = await uploadService.getPdfsByChatId(chatId);

    res.status(200).json({
        success: true,
        data: {
            count: pdfs.length,
            pdfs
        }
    });
});

//@desc Delete a PDF
//@route DELETE /api/upload/:pdfId
//@access private
const deletePdf = asyncHandler(async (req: Request, res: Response) => {
    const { pdfId } = req.params;

    const pdf = await uploadService.deletePdf(pdfId);

    // Delete the physical file from uploads folder
    const filePath = path.join(process.cwd(), 'uploads', pdf.fileName);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    res.status(200).json({
        success: true,
        message: 'PDF deleted successfully',
        data: pdf
    });
});

export { uploadPdf, getPdfsForChat, deletePdf };