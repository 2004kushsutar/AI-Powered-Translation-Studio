import asyncio
import json
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('config.env')

async def check():
    db = AsyncIOMotorClient(os.getenv('MONGO_URI'))[os.getenv('MONGO_DB_NAME')]
    doc = await db.documents.find_one({}, sort=[('_id', -1)])
    
    if not doc:
        print("No document found in db.documents!")
        return

    parsed = doc.get('parsed', {})
    if isinstance(parsed, str):
        parsed = json.loads(parsed)
        
    def find_chunks(node):
        found = []
        if isinstance(node, dict):
            if "original_chunks" in node:
                found.append({
                    "orig": node["original_chunks"],
                    "corr": node.get("corrected_chunks", [])
                })
            for v in node.values():
                found.extend(find_chunks(v))
        elif isinstance(node, list):
            for i in node:
                found.extend(find_chunks(i))
        return found
        
    chunks = find_chunks(parsed)
    total_corrected = sum(1 for c in chunks if c["corr"])
    print(f"Total nodes with original_chunks: {len(chunks)}")
    print(f"Total nodes with corrected_chunks populated: {total_corrected}")
    
    if total_corrected > 0:
        for c in chunks:
            if c["corr"] != c["orig"]:
                print("\\nDIFFERENCE FOUND:")
                print("ORIG:", c["orig"])
                print("CORR:", c["corr"])

asyncio.run(check())
