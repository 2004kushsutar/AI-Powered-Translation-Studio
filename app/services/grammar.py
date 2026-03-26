import language_tool_python
import re
from typing import Any
import spacy
import uuid

try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    pass

tool = language_tool_python.LanguageTool('en-US')

def check_grammar(text, label=None, seg_id=None):
    global nlp
    if 'nlp' not in globals() or nlp is None:
        nlp = spacy.load("en_core_web_sm")
        
    matches = tool.check(text)
    corrected_text = language_tool_python.utils.correct(text, matches)
    
    issues = []

    if label == "section_header":
        dangling_pattern = r'\s+\b(is|are|was|were|am|be|been|being|and|or|but|the|a|an|of|for|in|to|with|on|at|by)\b\s*$'
        match = re.search(dangling_pattern, corrected_text, flags=re.IGNORECASE)
        if match:
            word = match.group(1)
            corrected_text = re.sub(dangling_pattern, '', corrected_text, flags=re.IGNORECASE)
            issues.append({
                "id": str(uuid.uuid4()),
                "issue_type": "formatting",
                "severity": "low",
                "detected_text": word,
                "ai_suggested_fix": "(Remove word)",
                "context": text,
                "affected_segments": [seg_id] if seg_id is not None else []
            })
            
    for match in matches:
        # Extract metadata directly to perfectly populate Figma Issue Cards
        rule_type = getattr(match, 'ruleIssueType', getattr(match, 'rule_issue_type', ''))
        issue_type = "spelling" if rule_type == "misspelling" else "grammar"
        severity = "high" if issue_type == "spelling" else "medium"
        
        offset = getattr(match, 'offset', 0)
        error_length = getattr(match, 'errorLength', getattr(match, 'error_length', 0))
        detected = text[offset:offset+error_length]
        
        # Skip purely whitespace formatting issues (common in PDF extraction kerning)
        if not detected.strip():
            continue
        
        issues.append({
            "id": str(uuid.uuid4()),
            "issue_type": issue_type,
            "severity": severity,
            "detected_text": detected,
            "ai_suggested_fix": match.replacements[0] if match.replacements else "",
            "context": text,
            "affected_segments": [seg_id] if seg_id is not None else []
        })

    return issues