import { prisma } from "../lib/prisma";
import { fileUploadQueue } from "../queues/fileUpload.queue";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";

const BUCKET = "pdfs";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const pinecone = new PineconeClient({
  apiKey: process.env.PINECONE_API_KEY!,
});

export const fileService = {
  /**
   * Generate signed upload URLs for multiple files
   */
  async generateUploadURLs(
    userId: string,
    chatId: string,
    fileNames: string[]
  ) {
    // Validate chat ownership
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId },
    });

    if (!chat) {
      throw new Error("Chat not found or unauthorized");
    }

    // Generate URLs for each file
    const uploadData = await Promise.all(
      fileNames.map(async (fileName) => {
        // Validate PDF extension
        if (!fileName.toLowerCase().endsWith(".pdf")) {
          throw new Error(`Only PDF files are allowed: ${fileName}`);
        }

        const uniqueId = crypto.randomUUID();
        const filePath = `users/${userId}/chats/${chatId}/${uniqueId}.pdf`;

        // Create signed upload URL
        const { data, error } = await supabase.storage
          .from(BUCKET)
          .createSignedUploadUrl(filePath);

        if (error || !data) {
          console.error("Supabase signed upload error:", error);
          throw new Error(`Failed to create upload URL for ${fileName}`);
        }

        return {
          fileName,
          path: filePath,
          token: data.token,
          signedUrl: data.signedUrl,
        };
      })
    );

    return uploadData;
  },

  /**
   * Confirm file uploads and create DB records
   */
  async confirmUploads(
    userId: string,
    chatId: string,
    uploads: Array<{ fileName: string; path: string }>
  ) {
    // Validate chat ownership
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId },
    });

    if (!chat) {
      throw new Error("Chat not found");
    }

    // Verify files exist in Supabase
    const verifiedFiles = await Promise.all(
      uploads.map(async (upload) => {
        const folderPath = upload.path.substring(0, upload.path.lastIndexOf("/"));
        const fileName = upload.path.substring(upload.path.lastIndexOf("/") + 1);

        const { data, error } = await supabase.storage
          .from(BUCKET)
          .list(folderPath, { search: fileName });

        if (error || !data || data.length === 0) {
          throw new Error(`File not found in storage: ${upload.fileName}`);
        }

        return upload;
      })
    );

    // Create PDF records in database
    const pdfRecords = await Promise.all(
      verifiedFiles.map((file) =>
        prisma.pdf.create({
          data: {
            fileName: file.path,
            realName: file.fileName,
            chatId,
          },
        })
      )
    );

    // Add to processing queue
    await fileUploadQueue.add("file-ready", {
      chatId,
      pdfs: pdfRecords,
      files: verifiedFiles,
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

  async deletePdf(userId: string, pdfId: string) {
    const pdf = await prisma.pdf.findUnique({
      where: { id: pdfId },
      include: { chat: true },
    });

    if (!pdf || pdf.chat.userId !== userId) {
      throw new Error("PDF not found or unauthorized");
    }

    // Delete from Supabase storage
    const { error } = await supabase.storage.from(BUCKET).remove([pdf.fileName]);

    if (error) {
      console.error("Failed to delete from storage:", error);
    }

    // Delete from Pinecone
    try {
      const index = pinecone.Index("pdf");
      await index.namespace(pdf.chatId).deleteMany({
        pdfId: pdfId
      });
      console.log(`✅ Deleted vectors for PDF ${pdfId} from Pinecone`);
    } catch (pineconeError) {
      console.error("Failed to delete from Pinecone:", pineconeError);
    }

    // Delete from database
    await prisma.pdf.delete({
      where: { id: pdfId },
    });

    return { success: true };
  },

  /**
   * Generate signed URL to access/download a PDF
   */
  async getSignedUrl(userId: string, pdfId: string) {
    // Validate PDF ownership
    const pdf = await prisma.pdf.findUnique({
      where: { id: pdfId },
      include: { chat: true },
    });

    if (!pdf || pdf.chat.userId !== userId) {
      throw new Error("PDF not found or unauthorized");
    }

    // Generate signed URL (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(pdf.fileName, 3600);

    if (error || !data) {
      console.error("Supabase signed URL error:", error);
      throw new Error("Failed to generate signed URL");
    }

    return {
      signedUrl: data.signedUrl,
      fileName: pdf.realName,
      expiresIn: 3600, // seconds
    };
  }
};