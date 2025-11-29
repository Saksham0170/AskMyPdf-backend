import { prisma } from "../lib/prisma";

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
  }
};
