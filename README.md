## 🌟 Overview

**AskMyPDF** is a production-ready system that enables users to upload PDF documents and interact with them through AI-powered question answering. The system intelligently extracts text, generates embeddings, stores vectors, and uses semantic search to provide accurate responses.

**🔗 Live Demo:** [https://ask-my-pdf-frontend.vercel.app/](https://ask-my-pdf-frontend.vercel.app/)

### Key Capabilities

- 📤 **Secure PDF Upload** via Supabase Storage
- 🔄 **Asynchronous Processing** with BullMQ workers
- 🧠 **AI-Powered Answers** using LangChain + Google Gemini
- 🔍 **Semantic Search** with Pinecone vector database
- 🔐 **Authentication** via Clerk
- ⚡ **Rate Limiting** to prevent abuse
- 💾 **PostgreSQL Database** with Prisma ORM

---

## ✨ Features

### 1. **PDF Upload & Processing Pipeline**

- Generates secure, time-limited upload URLs using **Supabase Storage**
- Extracts text content from PDFs using **LangChain's PDFLoader**
- Intelligently chunks documents for optimal embedding performance
- Generates high-quality embeddings via **Google Gemini**
- Stores vector embeddings in **Pinecone** for lightning-fast semantic search

### 2. **Background Job Processing**

Powered by **BullMQ** with Redis Queues, the worker service handles compute-intensive tasks:

- PDF text extraction and parsing
- Embedding generation from document chunks
- Vector insertion into Pinecone index
- Real-time status updates in the database

This architecture ensures **fast API responses** while heavy processing happens asynchronously.

### 3. **AI Question Answering**

- Performs similarity search in Pinecone to find relevant document chunks
- Uses **Google Gemini** to generate contextual, accurate answers
- Maintains chat history for context-aware conversations

### 4. **Authentication & Security**

- **Clerk** authentication middleware protects all routes
- Token validation on every request
- User-scoped data access controls

### 5. **Database Layer**

- **PostgreSQL** database managed with **Prisma ORM**
- Stores PDF metadata, processing states, and chat history
- Connection pooling for production reliability

### 6. **Rate Limiting**

- Implements `rate-limiter-flexible` using redis to prevent API abuse
- Separate limits for AI queries, file uploads and general requests
- Configurable thresholds per endpoint

---

## 🛠 Tech Stack

| Component | Technology |
|-----------|-----------|
| **Backend Framework** | Express.js (TypeScript) |
| **Background Jobs** | BullMQ + Redis |
| **Database** | PostgreSQL + Prisma ORM |
| **Object Storage** | Supabase Storage |
| **Vector Database** | Pinecone |
| **AI Models** | Google Gemini |
| **Authentication** | Clerk |
| **PDF Parsing** | LangChain's PDFLoader |

---

## 📁 Project Structure

```
src/
 ├─ config/                # Configurations
 ├─ controllers/           # Route controllers
 ├─ lib/                   # Prisma client
 ├─ middlewares/           # Error handling, validation, rate limiting
 ├─ models/                # Data models
 ├─ queues/                # BullMQ queue definitions
 ├─ routes/                # API route declarations
 ├─ services/              # Business logic layer
 ├─ validation/            # Zod validation schemas
 └─ workers/               # PDF processing worker  
```

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
# Server
PORT=8000

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Redis (for BullMQ)
REDIS_HOST=your_redis_host
REDIS_PORT=your_redis_port
REDIS_USERNAME=your_redis_username
REDIS_PASSWORD=your_redis_password

# Pinecone
PINECONE_API_KEY=your_pinecone_api_key

# Google Gemini
GOOGLE_API_KEY=your_google_api_key

# Supabase Storage
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Clerk Authentication
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# Cors
CORS_ORIGIN=https://your-frontend-domain.com
```
---

## 🚀 Getting Started

### Prerequisites

- Node.js 22+ and npm
- PostgreSQL database
- Redis instance
- Accounts for: Supabase, Pinecone, Clerk, Google AI Studio

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/askmypdf-backend.git
cd askmypdf-backend
```

2. **Install dependencies**

```bash
npm install
```

3. **Generate Prisma Client**

```bash
npx prisma generate
```

4. **Run database migrations** (if applicable)

```bash
npx prisma migrate dev
```

### Development

**Terminal 1: Start the API server**

```bash
npm run dev
```

**Terminal 2: Start the background worker**

```bash
npm run dev:worker
```

The API will be available at `http://localhost:3000` (or your configured PORT).

---

## 📦 Production Deployment

### Build

```bash
npm run build
```

### Start Services

**API Server:**

```bash
npm run start
```

**Worker Service:**

```bash
npm run start:worker
```

### Deployment Notes

- Deploy **API** and **Worker** as **separate services**
- Ensure all environment variables are configured in your deployment platform
- Run `npx prisma generate` during the build process
- Configure proper CORS settings for your frontend domain

---

## 📡 API Endpoints

### File Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/files/:chatId/upload-urls` | Generate pre-signed Supabase Storage URLs for PDF uploads (3 uploads/day limit) |
| `POST` | `/api/files/:chatId/confirm-uploads` | Verify uploaded files, create DB records, queue for processing |
| `GET` | `/api/files/:chatId` | Retrieve all processed PDFs for a specific chat |
| `GET` | `/api/files/status/:pdfIds` | Check processing status of PDFs (comma-separated IDs, max 3) |
| `DELETE` | `/api/files/delete/:pdfId` | Delete PDF from storage, database, and Pinecone vectors |
| `GET` | `/api/files/access/:pdfId` | Generate temporary signed URL (1 hour) for PDF access/download |

### Chat Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/chat?page=1&limit=10` | Get paginated list of user's chats |
| `POST` | `/api/chat` | Create new chat session for authenticated user |
| `GET` | `/api/chat/:chatId?page=1&limit=20` | Get specific chat with messages and processed PDFs |
| `POST` | `/api/chat/:chatId/question` | Ask question using RAG pipeline, auto-generates chat name on first question |

### Key Features

- **Authentication**: All endpoints require Clerk JWT validation
- **Base URL**: `/api` prefix for all routes
- **File Validation**: Only PDF files accepted with size limits enforced
- **Auto-naming**: Chat identifier automatically generated (4-5 words) on first question
- **Status Filtering**: Only processed PDFs shown in chat responses
- **Semantic Search**: Questions searched across all PDFs in the chat using Pinecone
- **Signed URLs**: Temporary access URLs expire after 1 hour

---

## 🔄 How It Works

### PDF Upload Flow

1. Frontend requests signed upload URLs from `/api/files/:chatId/upload-urls`
2. Frontend uploads PDF(s) directly to Supabase Storage using signed URLs
3. Frontend confirms upload via `/api/files/:chatId/confirm-uploads`
4. Backend creates PDF records with "PROCESSING" status and adds jobs to BullMQ queue
5. Worker downloads PDF, extracts text using LangChain PDFLoader, chunks content, generates embeddings via Google Gemini, and stores vectors in Pinecone (namespaced by chatId)
6. Database updated with "COMPLETED" or "FAILED" status

### Question Answering Flow

1. User sends question to `/api/chat/:chatId/question`
2. Backend creates embedding for the question using Google Gemini
3. Performs similarity search in Pinecone namespace (chatId) to retrieve top 3 relevant chunks across all PDFs in that chat
4. Relevant chunks combined into context and passed to Google Gemini with the question
5. Gemini generates contextual answer in plain text format
6. Both question and answer saved as messages in database, returned to user with source references
7. When user asks first question in the chat, google gemini is used to generate a suitable name for the chat

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


## 📄 License

This project is licensed under the MIT License


## 📧 Contact

For questions or support, please open an issue or contact- sakshamgarg782@gmail.com


**Built with ❤️ by Saksham Garg**
