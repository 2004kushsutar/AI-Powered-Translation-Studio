import re
from collections import defaultdict

from typing import Any, Dict, List

# Pre-defined known terminology variations for tech/business context
TERMINOLOGY_GROUPS = [
    ["email", "e-mail", "e mail"],
    ["frontend", "front-end", "front end"],
    ["backend", "back-end", "back end"],
    ["ecommerce", "e-commerce", "e commerce"],
    ["startup", "start-up", "start up"],
    ["javascript", "java script"],
    ["us", "u.s.", "u.s"]
]

def get_casing_type(text):
    text = text.strip()
    if text.isupper():
        return "ALL CAPS"
        
    words = [w for w in text.split() if len(w) > 3]
    if not words:
        # If all words are short or it's a single word, rely on basic string checks
        return "Title Case" if text.istitle() else "Sentence case"
        
    capitalized_words = sum(1 for w in words if w[0].isupper() or w[0].isdigit())
    capitalization_ratio = capitalized_words / len(words)
    
    if capitalization_ratio >= 0.8:
        return "Title Case"
    if text[0].isupper() and capitalization_ratio <= 0.3:
        return "Sentence case"
        
    return "Mixed case"

def check_consistency(parsed_output):
    issues = []
    data = parsed_output.get("data")
    if not data:
        return {"inconsistency_flag": False, "issues": []}

    headers = []
    # Dictionary mapping group index -> dictionary of variant -> segment IDs
    term_usage: Dict[int, Dict[str, List[Any]]] = defaultdict(lambda: defaultdict(list)) 

    def traverse(node):
        if isinstance(node, dict):
            label = node.get("label", None)
            
            if "original_chunks" in node:
                segment_ids = node.get("segment_ids", [])
                for i, chunk in enumerate(node["original_chunks"]):
                    seg_id = segment_ids[i] if i < len(segment_ids) else None
                    
                    # 1. Collect Headers for Casing Check
                    if label == "section_header":
                        headers.append({"text": chunk, "segment_id": seg_id})
                    
                    # 2. Match Terminology Variations
                    chunk_lower = chunk.lower()
                    for group_idx, group in enumerate(TERMINOLOGY_GROUPS):
                        for variant in group:
                            # using regex boundaries to accurately grab exactly the phrase
                            pattern = r'\b' + re.escape(variant) + r'\b'
                            matches = re.findall(pattern, chunk_lower)
                            for _ in matches:
                                term_usage[group_idx][variant].append(seg_id)
            
            # Recurse
            for value in node.values():
                traverse(value)

        elif isinstance(node, list):
            for item in node:
                traverse(item)

    # Begin Traversal
    traverse(data)

    # Evaluation 1: Check Header Casing Consistency
    if headers:
        casing_counts: Dict[str, int] = defaultdict(int)
        for h in headers:
            h["casing"] = get_casing_type(h["text"])
            casing_counts[h["casing"]] += 1
        
        dominant_casing = max(casing_counts.items(), key=lambda x: x[1])[0]
        
        import uuid
        for h in headers:
            # We flag if it deviates from the majority and isn't totally unknown
            if h["casing"] != dominant_casing and h["casing"] != "Unknown":
                seg_list = [h["segment_id"]] if h["segment_id"] is not None else []
                issues.append({
                    "id": str(uuid.uuid4()),
                    "issue_type": "formatting",
                    "severity": "low",
                    "detected_text": h['text'],
                    "ai_suggested_fix": h['text'].title() if dominant_casing == "Title Case" else h['text'].capitalize(),
                    "context": f"Document generally formatted as {dominant_casing}",
                    "affected_segments": seg_list
                })

    # Evaluation 2: Terminology Variation Consistency
    for group_idx, variant_dict in term_usage.items():
        if len(variant_dict) > 1: # Flag whenever 2 or more variants are competing!
            total_usages = []
            all_segments = []
            for var, segs in variant_dict.items():
                total_usages.append(f"'{var}' (used {len(segs)} times)")
                all_segments.extend(segs)
            
            most_used_variant = max(variant_dict.items(), key=lambda x: len(x[1]))[0]
            clean_segments = list(set([s for s in all_segments if s is not None]))
            
            import uuid
            issues.append({
                "id": str(uuid.uuid4()),
                "issue_type": "terminology",
                "severity": "medium",
                "detected_text": ", ".join(variant_dict.keys()),
                "ai_suggested_fix": most_used_variant,
                "context": f"Inconsistent spelling detected: {', '.join(total_usages)}.",
                "affected_segments": clean_segments
            })

    return {
        "inconsistency_flag": len(issues) > 0,
        "issues": issues
    }