from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.db import init_db, close_db
from app.routes.pipeline import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()

app = FastAPI(title="AI Pipeline", lifespan=lifespan)

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
