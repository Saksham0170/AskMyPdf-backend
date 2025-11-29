import { Worker } from "bullmq";
import { redisConfig } from "../config/redis";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import fs from "fs";

const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GOOGLE_GENAI_API_KEY!,
  model: "gemini-embedding-001",
});

const pinecone = new PineconeClient({
  apiKey: process.env.PINECONE_API_KEY!,
});

const index = pinecone.Index("pdf");

const worker = new Worker(
  "fileUploadQueue",
  async (job) => {
    try {
      console.log("job:", job.data);

      const pdfs = job.data.pdfs;
      const chatId = job.data.chatId;

      const files =
        typeof job.data.files === "string"
          ? JSON.parse(job.data.files)
          : job.data.files;

      console.log(`Processing ${files.length} file(s)`);

      // process each file along with its DB record
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const pdfRecord = pdfs[i]; // pdfRecord.id is pdfId

        console.log(`Processing: ${file.originalName || file.originalname}`);

        // 1. load PDF
        const loader = new PDFLoader(file.path);
        const docs = await loader.load();

        // enrich metadata for each page
        docs.forEach((doc, pageIndex) => {
          doc.metadata = {
            ...doc.metadata,
            fileName: pdfRecord.realName, 
            pdfId: pdfRecord.id,
            page: doc.metadata?.loc?.pageNumber ?? pageIndex + 1,
            chatId: chatId,
            source: "pdf",
          };
        });

        // 2. chunk
        const splitter = new RecursiveCharacterTextSplitter({
          chunkSize: 1000,
          chunkOverlap: 200,
        });

        const splitDocs = await splitter.splitDocuments(docs);
        console.log("Chunks:", splitDocs.length);

        splitDocs.forEach((chunk, index) => {
          chunk.metadata = {
            ...chunk.metadata,
            chunkIndex: index,
            preview: chunk.pageContent.slice(0, 200),
          };
        });

        // 3. store in pinecone
        await PineconeStore.fromDocuments(splitDocs, embeddings, {
          pineconeIndex: index,
          maxConcurrency: 5,
          namespace: chatId, 
        });

        console.log(`Stored ${file.originalName || file.originalname}`);

        // 4. delete file from server
        fs.unlink(file.path, () => {});
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Worker error:", error.message, error.stack);
      } else {
        console.error("Worker error:", error);
      }
      throw error;
    }
  },
  { connection: redisConfig }
);

export default worker;
