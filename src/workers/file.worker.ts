import dotenv from "dotenv";
dotenv.config();

import { Worker } from "bullmq";
import { redisConfig } from "../config/redis";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "../lib/prisma";
import fs from "fs";
import path from "path";
import os from "os";

const BUCKET = "pdfs";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 3072-dim model
const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GOOGLE_GENAI_API_KEY!,
  model: "gemini-embedding-001",
});

const pinecone = new PineconeClient({
  apiKey: process.env.PINECONE_API_KEY!,
});

const index = pinecone.Index("pdf");


export const worker = new Worker(
  "fileUploadQueue",
  async (job) => {
    const processedPdfIds = new Set<string>();
    
    try {
      console.log("job:", job.data);

      const { pdfs, chatId } = job.data;

      const files =
        typeof job.data.files === "string"
          ? JSON.parse(job.data.files)
          : job.data.files;

      console.log(`Processing ${files.length} file(s)`);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const pdfRecord = pdfs[i];

        console.log(`Processing: ${pdfRecord.realName}`);

        // 1. Download PDF from Supabase to temp location
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(BUCKET)
          .download(pdfRecord.fileName);

        if (downloadError || !fileData) {
          console.error("Failed to download from Supabase:", downloadError);
          throw new Error(`Failed to download file: ${pdfRecord.realName}`);
        }

        // Save to temp file
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, `${pdfRecord.id}.pdf`);
        const arrayBuffer = await fileData.arrayBuffer();
        fs.writeFileSync(tempFilePath, Buffer.from(arrayBuffer));

        console.log(`Downloaded to temp: ${tempFilePath}`);

        // 2. Load PDF
        const loader = new PDFLoader(tempFilePath);
        const docs = await loader.load();

        // Enrich metadata for each page
        docs.forEach((doc, pageIndex) => {
          doc.metadata = {
            fileName: pdfRecord.realName,
            pdfId: pdfRecord.id,
            page: doc.metadata?.loc?.pageNumber ?? pageIndex + 1,
            chatId,
            source: "pdf",
          };
        });

        // 3. Chunk
        const splitter = new RecursiveCharacterTextSplitter({
          chunkSize: 2000,
          chunkOverlap: 200,
        });

        const chunks = await splitter.splitDocuments(docs);
        console.log("Total chunks:", chunks.length);

        chunks.forEach((chunk, idx) => {
          chunk.metadata = {
            pdfId: pdfRecord.id,
            chatId,
            page: chunk.metadata?.page ?? idx + 1,
            fileName: pdfRecord.realName,
            chunkIndex: idx,
            text: chunk.pageContent,
            preview: chunk.pageContent.slice(0, 200),
            source: "pdf",
          };
        });

        // 4. EMBEDDINGS (optimized batch)
        console.log("Embedding chunks…");

        const texts = chunks.map((c) => c.pageContent);

        // Gemini can embed large batches at once
        const vectors = await embeddings.embedDocuments(texts);

        console.log("Embedding complete. Vector length sample:", vectors[0]?.length);

        // SAFETY CHECK
        if (!vectors.length || vectors[0].length !== 3072) {
          throw new Error(
            `Embedding dimension mismatch. Got ${vectors[0]?.length}, expected 3072`
          );
        }

        // 4. PREP VECTORS FOR PINECONE
        const pineconeVectors = vectors.map((v, idx) => ({
          id: `${pdfRecord.id}_chunk_${idx}`,
          values: v,
          metadata: chunks[idx].metadata,
        }));

        // 5. UPSERT IN BIG BATCHES (fast)
        console.log("Upserting to Pinecone...");

        const batchSize = 100; // large batch for speed
        for (let start = 0; start < pineconeVectors.length; start += batchSize) {
          const batch = pineconeVectors.slice(start, start + batchSize);

          await index.namespace(chatId).upsert(batch);

          console.log(
            `Upserted batch ${Math.floor(start / batchSize) + 1} / ${Math.ceil(
              pineconeVectors.length / batchSize
            )}`
          );
        }

        console.log("Stored:", pdfRecord.realName);

        // 6. Update PDF status to COMPLETED
        await prisma.pdf.update({
          where: { id: pdfRecord.id },
          data: { status: "COMPLETED" },
        });
        console.log(`PDF processing completed: ${pdfRecord.realName}`);
        
        // Mark as successfully processed
        processedPdfIds.add(pdfRecord.id);

        // 7. Delete temp file
        fs.unlinkSync(tempFilePath);
        console.log(`Deleted temp file: ${tempFilePath}`);
      }
    } catch (err: any) {
      console.error("Worker error:", err.message);

      // Mark unprocessed PDFs as FAILED
      try {
        const failedPdfIds = job.data.pdfs
          .map((p: any) => p.id)
          .filter((id: string) => !processedPdfIds.has(id));

        if (failedPdfIds.length > 0) {
          await prisma.pdf.updateMany({
            where: { id: { in: failedPdfIds } },
            data: { status: "FAILED" },
          });
          console.log(`Marked ${failedPdfIds.length} PDF(s) as FAILED`);
        }
      } catch (updateErr) {
        console.error("Failed to update PDF status:", updateErr);
      }

      throw err;
    }
  },
  {
    connection: redisConfig,
  }
);

export default worker;
