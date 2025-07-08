# API Endpoints - Breslev Torah Online

## FastAPI Backend Endpoints (Port 8000)

### Health & System
- `GET /health` → Service health check
- `GET /api/v1/status` → Detailed system status

### Books & Texts
- `GET /api/v1/books` → List all 13 Breslov books
- `GET /api/v1/books/{book_id}` → Get specific book metadata
- `GET /api/v1/books/{book_id}/chapters` → Get book chapters
- `GET /api/v1/books/{book_id}/chapters/{chapter_id}` → Get chapter content

### Search & Discovery
- `POST /api/v1/search` → Hybrid search (vector + keyword)
- `GET /api/v1/search/suggestions` → Search autocomplete
- `POST /api/v1/search/semantic` → Pure vector search

### AI Chat & Analysis
- `POST /api/v1/chat` → AI conversation with context
- `POST /api/v1/chat/stream` → Streaming AI responses (SSE)
- `POST /api/v1/analyze` → Text analysis and insights

### Translation
- `POST /api/v1/translate` → Gemini-powered French translation
- `GET /api/v1/translate/cache/{text_hash}` → Get cached translation

### Text-to-Speech
- `POST /api/v1/tts` → Generate audio (Edge TTS)
- `GET /api/v1/tts/voices` → Available voices by language
- `GET /api/v1/tts/cache/{audio_hash}` → Get cached audio

### Authentication (Future)
- `POST /api/v1/auth/login` → User authentication
- `POST /api/v1/auth/logout` → User logout
- `GET /api/v1/auth/profile` → User profile

## Next.js Frontend Routes (Port 3000)

### Pages
- `/` → Home page with book selection
- `/books/[bookId]` → Book reader interface
- `/search` → Search interface
- `/chat` → AI chat interface

### API Routes (Proxy to FastAPI)
- `/api/backend/*` → Proxies to FastAPI backend

## WebSocket/SSE Endpoints

### Real-time Features
- `WS /api/v1/ws/chat` → Chat WebSocket connection
- `SSE /api/v1/stream/responses` → Server-sent events for AI responses

## Status Codes

### Success
- `200` → OK
- `201` → Created
- `204` → No Content

### Client Errors
- `400` → Bad Request
- `401` → Unauthorized
- `404` → Not Found
- `429` → Rate Limited

### Server Errors
- `500` → Internal Server Error
- `503` → Service Unavailable

---

*Note: Cette liste sera mise à jour au fur et à mesure de l'implémentation*