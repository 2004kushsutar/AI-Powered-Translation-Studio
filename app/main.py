from fastapi import FastAPI
from app.routes.pipeline import router

app = FastAPI(title = "AI Pipeline")

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Pipeline API. Visit /docs to test the endpoints."}

app.include_router(router)
