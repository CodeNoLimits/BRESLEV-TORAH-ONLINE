from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import texts, books, gemini, tts

app = FastAPI(
    title="Breslev Torah API",
    description="API pour l'étude des textes de Rabbi Nachman avec IA",
    version="1.0.0"
)

# CORS pour Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes API v1
app.include_router(texts.router, prefix="/api/v1/texts", tags=["texts"])
app.include_router(books.router, prefix="/api/v1/books", tags=["books"])
app.include_router(gemini.router, prefix="/api/v1/gemini", tags=["gemini"])
app.include_router(tts.router, prefix="/api/v1/tts", tags=["tts"])

@app.get("/")
async def root():
    return {"message": "🔥 Breslev Torah API - Ready!", "books": 12}

@app.get("/health")
async def health():
    return {"status": "healthy", "api": "v1"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)