import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Load environment variables from config.env
load_dotenv("config.env")

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("MONGO_DB_NAME")

client = None
db = None

async def init_db():
    global client, db
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    print(f"Connected to MongoDB at {MONGO_URI}, DB: {DB_NAME}")

async def close_db():
    global client
    if client:
        client.close()
        print("MongoDB connection closed.")

def get_db():
    return db
