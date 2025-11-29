import { prisma } from "../lib/prisma";
import { fileUploadQueue } from "../queues/fileUpload.queue";

interface FileData {
  filename: string;
  originalname: string;
  path: string;
  size: number;
  mimetype: string;
}

export const uploadService = {
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
    });
    return pdfRecords;
  },

  async getPdfsByChatId(chatId: string) {
    return prisma.pdf.findMany({
      where: { chatId },
      orderBy: { createdAt: 'desc' }
    });
  },

  async deletePdf(pdfId: string) {
    return prisma.pdf.delete({
      where: { id: pdfId }
    });
  }
};