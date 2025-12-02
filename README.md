# Chatbot RAG with ChromaDB

This project is a full-stack application that demonstrates Retrieval-Augmented Generation (RAG) using ChromaDB as the vector database. It consists of a Node.js/Express backend and a Vite/React frontend.

## Features
- Upload PDF documents and store embeddings in ChromaDB
- Chatbot interface that answers questions using RAG (retrieves relevant context from uploaded documents)
- Supports both OpenAI and Gemini models for generating responses
- REST API endpoints for chat, document upload, and RAG operations
- Modern React frontend with Tailwind CSS

## Project Structure
```
chatbot-rag-chromadb/
  back-end/        # Node.js/Express backend
    routes/        # API routes (chat, documents, rag, upload)
    services/      # ChromaDB, embedding, model services
    uploads/       # Uploaded PDF files
  front-end/       # Vite/React frontend
    src/           # React components and assets
```

## Getting Started

### Backend
1. Install dependencies:
   ```bash
   cd back-end
   npm install
   ```
2. Start the backend server:
   ```bash
   npm start
   ```

### Frontend
1. Install dependencies:
   ```bash
   cd front-end
   npm install
   ```
2. Start the frontend development server:
   ```bash
   npm run dev
   ```

## Usage
- Upload PDF documents via the frontend
- Ask questions in the chat interface
- The backend retrieves relevant context from ChromaDB and generates answers using the selected model

## Technologies Used
- Node.js, Express
- ChromaDB
- OpenAI API, Gemini API
- React, Vite, Tailwind CSS

## License
MIT
