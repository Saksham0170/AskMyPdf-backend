import { Worker } from "bullmq";
import { redisConfig } from "../config/redis";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import fs from "fs";

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

        console.log(`Processing: ${file.originalName || file.originalname}`);

        // 1. load PDF
        const loader = new PDFLoader(file.path);
        const docs = await loader.load();

        // enrich metadata for each page
        docs.forEach((doc, pageIndex) => {
          doc.metadata = {
            fileName: pdfRecord.realName,
            pdfId: pdfRecord.id,
            page: doc.metadata?.loc?.pageNumber ?? pageIndex + 1,
            chatId,
            source: "pdf",
          };
        });

        // 2. chunk
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

        // 3. EMBEDDINGS (optimized batch)
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

        console.log("Stored:", file.originalName || file.originalname);

        // 6. DELETE TEMP FILE
        fs.unlink(file.path, () => { });
      }
    } catch (err: any) {
      console.error("Worker error:", err.message);
      throw err;
    }
  },
  {
    connection: redisConfig,
  }
);

export default worker;
