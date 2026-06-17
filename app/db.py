import os
from dotenv import dotenv_values
from motor.motor_asyncio import AsyncIOMotorClient

# Load environment variables directly from file to avoid os.environ caching issues
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", "config.env")
config = dotenv_values(env_path)

MONGO_URI = config.get("MONGO_URI") or os.getenv("MONGO_URI")
DB_NAME = config.get("MONGO_DB_NAME") or os.getenv("MONGO_DB_NAME")

print(f"DEBUG: loaded MONGO_URI from {env_path}: {'*hidden*' if MONGO_URI else 'None'}")

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
