from fastapi import APIRouter, UploadFile, File
import shutil
import os

from app.services.parser import parse_document
from app.services.consistency import check_consistency
from app.services.grammar import check_grammar
from app.utils.helpers import extract_sentences
from app.db import get_db

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/process")
async def process_file(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    parsed = parse_document(file_path)
    issues = []
    
    consistency_data = check_consistency(parsed)
    issues.extend(consistency_data.get("issues", []))

    if parsed.get("data"):
        sentences = extract_sentences(parsed["data"])
        for item in sentences:
            grammar_issues = check_grammar(item["text"], label=item["label"], seg_id=item.get("seg_id"))
            issues.extend(grammar_issues)
            
    stats = {
        "high": sum(1 for i in issues if i["severity"] == "high"),
        "medium": sum(1 for i in issues if i["severity"] == "medium"),
        "low": sum(1 for i in issues if i["severity"] == "low"),
        "resolved": 0
    }
    
    result = {
        "status": "success",
        "stats": stats,
        "issues": issues,
        "parsed": parsed
    }
    
    # Store the result in MongoDB
    db = get_db()
    if db is not None:
        import json
        result_to_insert = result.copy()
        result_to_insert["parsed"] = json.dumps(result["parsed"], ensure_ascii=False)
        try:
            await db.documents.insert_one(result_to_insert)
        except Exception as e:
            print(f"MongoDB Insert Error: {e}")
            result["db_error"] = str(e)
            
        # Ensure we don't accidentally leak ObjectId to our returning payload
        result_to_insert.pop("_id", None)
        result.pop("_id", None)
            
    return result

@router.get("/sourcevalidation")
async def get_source_validation():
    db = get_db()
    if db is not None:
        doc = await db.documents.find_one({}, sort=[('_id', -1)])
        if doc:
            import json
            parsed_data = doc.get("parsed", {})
            if isinstance(parsed_data, str):
                parsed_data = json.loads(parsed_data)
                
            return {
                "status": doc.get("status", "success"),
                "stats": doc.get("stats", {}),
                "issues": doc.get("issues", []),
                "parsed": parsed_data
            }
    return {"error": "No data found. Please upload a file first via POST /process."}

from pydantic import BaseModel
from typing import List, Optional
import re

class IssueModel(BaseModel):
    id: str | int
    status: str
    resolvedTo: Optional[str] = None
    affected_segments: List[int] = []
    detected_text: Optional[str] = None

class SaveRequest(BaseModel):
    issues: List[IssueModel]

def apply_corrections(data, issues_map):
    if isinstance(data, dict):
        if "original_chunks" in data and "segment_ids" in data:
            corrected_chunks = []
            for i, chunk in enumerate(data["original_chunks"]):
                seg_id = data["segment_ids"][i]
                new_chunk = chunk
                
                # Apply all resolved issues for this segment matching the React logic
                if seg_id in issues_map:
                    for issue in issues_map[seg_id]:
                        if issue.status == "resolved" and issue.resolvedTo is not None and issue.detected_text:
                            if issue.resolvedTo == "":
                                pattern = r"\s*\b" + re.escape(issue.detected_text) + r"\b\s*"
                                new_chunk = re.sub(pattern, " ", new_chunk)
                            else:
                                new_chunk = new_chunk.replace(issue.detected_text, issue.resolvedTo)
                corrected_chunks.append(new_chunk.strip())
            data["corrected_chunks"] = corrected_chunks
            
        for key, value in data.items():
            apply_corrections(value, issues_map)
            
    elif isinstance(data, list):
        for item in data:
            apply_corrections(item, issues_map)

@router.post("/save")
async def save_document(request: SaveRequest):
    db = get_db()
    if db is None:
        return {"status": "error", "message": "Database not connected."}
        
    try:
        doc = await db.documents.find_one({}, sort=[('_id', -1)])
        if not doc:
            return {"status": "error", "message": "No document found in database."}
            
        import json
        parsed_data = doc.get("parsed", {})
        if isinstance(parsed_data, str):
            parsed_data = json.loads(parsed_data)
        
        issues_map = {}
        for issue in request.issues:
            if issue.status == "resolved":
                for seg_id in issue.affected_segments:
                    if seg_id not in issues_map:
                        issues_map[seg_id] = []
                    issues_map[seg_id].append(issue)
                    
        apply_corrections(parsed_data, issues_map)
        
        await db.documents.update_one({'_id': doc['_id']}, {'$set': {'parsed': json.dumps(parsed_data, ensure_ascii=False)}})
            
        return {"status": "success", "message": "Changes written permanently to MongoDB."}
    except Exception as e:
        return {"status": "error", "message": str(e)}