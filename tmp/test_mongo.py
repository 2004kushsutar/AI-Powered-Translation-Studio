import asyncio
import json
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv("config.env")

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB_NAME", "pipeline_db")

async def test_insert():
    print(f"Connecting to {MONGO_URI} / {DB_NAME}")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    
    # try:
    #     with open("processed_output.json", "r", encoding="utf-8") as f:
    #         data = json.load(f)
            
    #     print("Inserting document...")
    #     result = await db.documents.insert_one(data)
    #     print(f"Inserted successfully! ID: {result.inserted_id}")
    # except Exception as e:
    #     print(f"Error occurred: {type(e).__name__}: {e}")
        
    client.close()

if __name__ == "__main__":
    asyncio.run(test_insert())
