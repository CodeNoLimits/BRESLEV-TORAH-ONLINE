from fastapi import FastAPI

app = FastAPI(
    title="Breslev Torah API",
    description="API pour l'étude des textes de Rabbi Nachman avec IA",
    version="1.0.0"
)

@app.get("/")
async def root():
    return {"message": "🔥 Breslev Torah API - Ready!", "books": 12}

@app.get("/health")
async def health():
    return {"status": "healthy", "api": "v1"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)