import { prisma } from "../lib/prisma";
import { fileUploadQueue } from "../queues/fileUpload.queue";
import fs from "fs";
import path from "path";

export const fileService = {
  async uploadFile(chatId: string, files: Express.Multer.File[]) {
    // Save PDF records to database
    const pdfRecords = await Promise.all(
      files.map(file =>
        prisma.pdf.create({
          data: {
            chatId,
            fileName: file.filename,
            realName: file.originalname,
          },
        })
      )
    );

    // Add files to processing queue
    await fileUploadQueue.add("file-ready", {
      chatId,
      pdfs: pdfRecords,
      files: files.map(f => ({
        path: f.path,
        fileName: f.filename,
        originalName: f.originalname,
      })),
    }, {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 3000,
        jitter: 0.3,  
      },
    });

    return pdfRecords;
  },

  async getPdfsByChatId(chatId: string) {
    return prisma.pdf.findMany({
      where: { chatId },
      orderBy: { createdAt: 'desc' }
    });
  },

  async getPdfById(pdfId: string) {
    return prisma.pdf.findUnique({
      where: { id: pdfId }
    });
  },

  async deletePdf(pdfId: string) {
    const pdf = await prisma.pdf.delete({
      where: { id: pdfId }
    });

    // Delete the physical file from uploads folder
    const filePath = path.join(process.cwd(), 'uploads', pdf.fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return pdf;
  }
};