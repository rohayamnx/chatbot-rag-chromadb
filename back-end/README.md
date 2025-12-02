# AI Chatbot Backend (with RAG + ChromaDB)

This is a Node.js Express backend for an AI chatbot with Retrieval-Augmented Generation (RAG). It supports:
- PDF upload → text extraction and chunking
- Embedding with Google Gemini embeddings
- Vector storage and retrieval with ChromaDB
- Answering via Gemini 2.5 Flash grounded on retrieved context

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **AI APIs**: 
  - Google Generative AI (Gemini 2.5 Flash for answers; text-embedding-004 for embeddings)
  - OpenAI (optional legacy route)
- **Middleware**: 
  - CORS
  - Body-Parser
  - Dotenv (for environment variables)
- **Development**: Nodemon (for auto-restart during development)
- **Vector DB**: ChromaDB (self-hosted)

## Prerequisites

Before running this project, make sure you have:

- **Node.js** (v16 or higher) - `node -v`
- **npm** (comes with Node.js)
- **API Keys**:
  - Google Gemini API Key - `https://ai.google.dev/` (console)
  - OpenAI API Key (optional) - `https://platform.openai.com/api-keys`
- **ChromaDB** server (v1 or v2). See “Chroma Setup”.

## Installation

1. **Navigate to the backend directory**:
   ```bash
   cd ai-chatbot/back-end
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create a `.env` file** in the `back-end` directory:
   ```bash
   touch .env
   ```

4. **Add your API keys and Chroma config** to the `.env` file:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here # optional
   CHROMA_URL=http://localhost:8000
   CHROMA_COLLECTION=documents
   PORT=3001
   ```

   > Replace the placeholders with your actual values.

## Chroma Setup

You can run ChromaDB via Docker or without Docker. The current backend code targets the Chroma v1 API. If you run the latest Chroma v2 server, you will need code updates to use the v2 APIs.

### Option A — Chroma v1 (compatible with current backend)
```bash
docker rm -f chroma || true
docker run -d --name chroma -p 8000:8000 ghcr.io/chroma-core/chroma:0.4.24
curl http://localhost:8000/api/v1/heartbeat
# expect: {"nanosecond heartbeat": ...}
```

### Option B — Chroma v2 (latest)
If you prefer the latest Chroma v2:
```bash
docker rm -f chroma || true
docker run -d --name chroma -p 8000:8000 ghcr.io/chroma-core/chroma:latest
curl http://localhost:8000/api/v2/heartbeat
```
Note: The current backend uses the v1 client semantics (e.g., `/v1` endpoints). Running a v2 server will return:
`{"error":"Unimplemented","message":"The v1 API is deprecated. Please use /v2 apis"}`

Ask us to migrate the backend to Chroma v2, and we’ll update the service layer accordingly.

### No Docker (local install)
```bash
# Python 3.10+ recommended
python3 -m venv ~/.venvs/chroma
source ~/.venvs/chroma/bin/activate
python -m pip install --upgrade pip
pip install chromadb

# v1-compatible CLI
chroma run --host 0.0.0.0 --port 8000 --path ~/chroma-data
# or (fallback)
python -m uvicorn chromadb.app:app --host 0.0.0.0 --port 8000
```

## Running the Server

### Development Mode (with auto-restart)

```bash
npm run dev
```

The server will start on `http://localhost:3001` and automatically restart when you make changes to the code.

### Production Mode

```bash
npm start
```

The server will start on `http://localhost:3001` (or the port specified in your `.env` file).

## API Endpoints

### RAG: Upload PDF
**POST** `/api/upload-pdf`

Uploads a PDF, extracts text, chunks, embeds with Gemini, and stores in ChromaDB.

Request: multipart/form-data with field `file` (PDF).
```bash
curl -X POST http://localhost:3001/api/upload-pdf \
  -F "file=@/path/to/your.pdf"
```

Success response:
```json
{
  "status": "ok",
  "collection": "documents",
  "docId": "9f5b3c7e-1b7e-4a0e-8d1f-8f6c2e6b1c1a",
  "fileName": "your.pdf",
  "chunks": 42
}
```

### RAG: Chat with Retrieval
**POST** `/api/chat-rag`

Sends a query, embeds it, retrieves similar chunks from Chroma, and answers via Gemini 2.5 Flash using the retrieved context.

Request body:
```json
{
  "message": "What does the document say about refunds?",
  "topK": 5
}
```

Success response:
```json
{
  "reply": "Based on the provided documents, ...",
  "sources": [
    { "docId": "uuid", "chunkIndex": 0, "fileName": "your.pdf" }
  ]
}
```

### Legacy: Gemini Chat (no retrieval)

**POST** `/api/chat`

Send a message to the Gemini AI model.

**Request Body**:
```json
{
  "message": "Your message here"
}
```

**Response** (Success - 200):
```json
{
  "reply": "AI response from Gemini"
}
```

**Response** (Error - 400):
```json
{
  "error": "Message is required"
}
```

**Response** (Error - 500):
```json
{
  "error": "Gemini API error",
  "details": "Error details from the API"
}
```

**Example Request**:
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, how are you?"}'
```

## Project Structure

```
back-end/
├── app.js                    # Main Express application
├── package.json              # Project dependencies and scripts
├── .env                      # Environment variables (create this)
├── routes/
│   ├── chat.js               # Legacy chat (no retrieval)
│   ├── upload.js             # PDF upload + embed + store in Chroma
│   └── rag.js                # Retrieval + Gemini answer
└── services/
    ├── geminiService.js      # Gemini chat + generateWithContext
    ├── embeddingService.js   # Gemini text-embedding-004
    ├── pdfService.js         # pdf-parse + chunking
    ├── chromaService.js      # Chroma client (v1 semantics)
    └── openaiService.js      # OpenAI API service (optional)
```

## Dependencies

- **express** (^4.18.3) - Web framework
- **cors** (^2.8.5) - Enable CORS
- **body-parser** (^2.2.0) - Parse JSON request bodies
- **dotenv** (^16.4.5) - Environment variable management
- **@google/generative-ai** (^0.24.1) - Google Gemini API client (chat + embeddings)
- **openai** (^5.3.0) - OpenAI API client (optional)
- **multer** (^2.0.1) - File upload handling
- **pdf-parse** (^1.1.1) - PDF parsing
- **chromadb** - Chroma client
- **uuid** - IDs for stored chunks
- **nodemon** (^3.1.0) - Development auto-restart tool

## How It Works (RAG flow)

1. **Upload PDF** (`/api/upload-pdf`)
   - Parse text via `pdf-parse`
   - Chunk text with overlap to preserve context
   - Generate embeddings via Gemini `text-embedding-004`
   - Upsert `ids`, `documents`, `metadatas`, `embeddings` into Chroma (`CHROMA_COLLECTION`)
2. **Ask a question** (`/api/chat-rag`)
   - Embed query with Gemini
   - Query Chroma for top-K similar chunks
   - Build a context block from retrieved documents
   - Ask Gemini 2.5 Flash to answer based only on that context

## Troubleshooting

### Chroma “v1 API is deprecated” error
- You’re likely running a Chroma v2 server with the v1 client. Use the v1 container (`ghcr.io/chroma-core/chroma:0.4.24`) or ask to migrate the backend to v2 APIs.

### "Cannot find module" error
```bash
npm install
```

### "API Key is missing" error
- Ensure you've created a `.env` file in the `back-end` directory
- Check that your API keys are correctly set in the `.env` file
- Make sure there are no extra spaces or quotes around your API keys

### Port already in use
If port 3001 is already in use, you can specify a different port in your `.env` file:
```
PORT=3002
```

### CORS errors
The server is configured with CORS enabled. If you still encounter CORS issues, check:
- The frontend is making requests to the correct API URL
- The frontend is running on a different origin than the backend

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `GEMINI_API_KEY` | Google Generative AI API Key | Yes | N/A |
| `OPENAI_API_KEY` | OpenAI API Key | No | N/A |
| `CHROMA_URL` | Chroma server URL | No | `http://localhost:8000` |
| `CHROMA_COLLECTION` | Chroma collection name | No | `documents` |
| `PORT` | Server port | No | 3001 |

## Frontend Integration

- Upload: `POST http://localhost:3001/api/upload-pdf` (form-data with `file`)
- Ask: `POST http://localhost:3001/api/chat-rag` (JSON `{ "message": "...", "topK": 5 }`)
- Legacy chat: `POST http://localhost:3001/api/chat`

## Development Tips

1. **Hot Reload**: Use `npm run dev` during development to automatically restart the server on code changes
2. **Testing**: Use tools like Postman or curl to test API endpoints
3. **Logs**: Check the console output for error messages and debug information
4. **Error Handling**: API errors will be logged in the console

## Future Enhancements

- [ ] Chroma v2 client migration
- [ ] Request validation middleware
- [ ] Conversation history/context memory
- [ ] Authentication/authorization
- [ ] Rate limiting
- [ ] Structured logging
- [ ] Error tracking
- [ ] Streaming responses
- [ ] Message persistence (DB)

## License

ISC

## Support

For issues or questions, please check the error messages in the console or refer to the official documentation:
- [Google Generative AI Documentation](https://ai.google.dev/)
- [OpenAI API Documentation](https://platform.openai.com/docs/)
- [Express.js Documentation](https://expressjs.com/)

