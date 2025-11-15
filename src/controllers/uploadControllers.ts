import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

//@desc Upload PDF files (max 5)
//@route POST /api/upload
//@access public
const uploadPdf = asyncHandler(async (req: Request, res: Response) => {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
        res.status(400);
        throw new Error('No files uploaded');
    }

    const files = req.files as Express.Multer.File[];

    res.status(200).json({
        success: true,
        message: `${files.length} file(s) uploaded successfully`,
        data: {
            count: files.length,
            files: files.map(file => ({
                filename: file.filename,
                originalname: file.originalname,
                path: file.path,
                size: file.size,
                mimetype: file.mimetype
            }))
        }
    });
});


export { uploadPdf };