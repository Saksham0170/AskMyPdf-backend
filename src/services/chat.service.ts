import { prisma } from "../lib/prisma";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";

const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GOOGLE_API_KEY!,
  model: "gemini-embedding-001",
});

const pinecone = new PineconeClient({
  apiKey: process.env.PINECONE_API_KEY!,
});

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export const chatService = {
  async createChat(userId: string) {
    return prisma.chat.create({
      data: { userId },
    });
  },

  async getUserChats(userId: string) {
    return prisma.chat.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  },

  async getChatById(userId: string, chatId: string) {
    return prisma.chat.findFirst({
      where: { id: chatId, userId },
      include: {
        pdfs: true,
        messages: {
          orderBy: { createdAt: "asc" }
        }
      },
    });
  },

  async askQuestion(userId: string, chatId: string, question: string) {
    const chat = await this.getChatById(userId, chatId);
    if (!chat) {
      throw new Error("Chat not found");
    }

    // Check if chat needs a name
    const needsName = !chat.identifier;

    // 1. Create embedding for the question
    const questionVector = await embeddings.embedQuery(question);

    // 2. Search Pinecone for relevant chunks
    const index = pinecone.Index("pdf");
    const searchResults = await index.namespace(chatId).query({
      vector: questionVector,
      topK: 3, // Get top 5 most relevant chunks
      includeMetadata: true,
    });

    // 3. Extract context from search results
    const context = searchResults.matches
      .map((match) => match.metadata?.text || "")
      .join("\n\n");

    // 4. Generate answer using Gemini with context
    const prompt = `You are an AI assistant answering questions based on the provided PDF context.

RULES:
- Provide your answer in plain text format suitable for chat, NOT in Markdown.
- Do NOT use any Markdown formatting like **, ##, -, etc.
- Write naturally as if speaking in a conversation.
- Do NOT invent information not present in the context.
- If the context does not contain the answer, say: "The answer is not available in the provided context."

CONTEXT:
${context}

QUESTION:
${question}

ANSWER:
`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    // 5. Save question and answer to database
    const [userMessage, aiMessage] = await Promise.all([
      prisma.message.create({
        data: {
          chatId,
          role: "USER",
          content: question,
        },
      }),
      prisma.message.create({
        data: {
          chatId,
          role: "AI",
          content: answer,
        },
      }),
    ]);

    // 6. Generate chat name if identifier is null
    if (needsName) {
      try {
        const namePrompt = `Based on this question, generate a concise chat title (maximum 4-5 words):

Question: ${question}

Return only the title, nothing else.`;

        const nameResult = await model.generateContent(namePrompt);
        const chatName = nameResult.response.text().trim();

        // Update chat with generated name
        await prisma.chat.update({
          where: { id: chatId },
          data: { identifier: chatName },
        });
      } catch (error) {
        console.error("Failed to generate chat name:", error);
        // Don't fail the request if name generation fails
      }
    }

    return {
      question: userMessage,
      answer: aiMessage,
      sources: searchResults.matches.map((match) => ({
        fileName: match.metadata?.fileName,
        page: match.metadata?.page,
        preview: match.metadata?.preview,
        score: match.score,
      })),
    };
  }
};