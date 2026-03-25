from docling.document_converter import DocumentConverter
import re
import nltk
from nltk.tokenize import sent_tokenize
import fitz  # PyMuPDF

nltk.download('punkt', quiet=True)

converter = DocumentConverter()

def normalize(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'-', ' ', text)
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text

def extract_styles_from_page(fitz_page):
    styles = []
    try:
        blocks = fitz_page.get_text("dict").get("blocks", [])
        for b in blocks:
            for l in b.get("lines", []):
                for s in l.get("spans", []):
                    color_int = s.get("color", 0)
                    hex_color = f"#{color_int:06x}" if isinstance(color_int, int) else "#000000"
                    
                    font_name = s.get("font", "inherit")
                    size = s.get("size", 12)
                    styles.append({
                        "text": s.get("text", "").strip(),
                        "font": font_name,
                        "size": size,
                        "color": hex_color
                    })
    except Exception:
        pass
    return styles

def get_style_for_block(block, fitz_doc, pages_cache):
    default_style = {"fontFamily": "inherit", "fontSize": None, "color": "inherit"}
    
    if not fitz_doc:
        return default_style
        
    try:
        prov = block.get("prov", [])
        if not prov:
            return default_style
            
        page_no = prov[0].get("page_no", 1)
        
        fitz_page_index = page_no - 1
        if fitz_page_index < 0 or fitz_page_index >= len(fitz_doc):
            return default_style
            
        if fitz_page_index not in pages_cache:
            pages_cache[fitz_page_index] = extract_styles_from_page(fitz_doc[fitz_page_index])
            
        page_styles = pages_cache[fitz_page_index]
        block_text = block.get("text", "").lower()
        if not block_text:
            return default_style
            
        for s in page_styles:
            if s["text"] and len(s["text"]) > 2:
                if s["text"].lower() in block_text or block_text in s["text"].lower():
                    return {"fontFamily": s["font"], "fontSize": round(s["size"]), "color": s["color"]}
                    
    except Exception as e:
        print("Style match error", e)
        pass
        
    return default_style

def process_block(block, segment_counter, fitz_doc, pages_cache):
    if not isinstance(block, dict):
        return block, segment_counter

    if "text" not in block:
        return block, segment_counter

    text = block["text"]
    block["style"] = get_style_for_block(block, fitz_doc, pages_cache)

    sentences = sent_tokenize(text)
    clean_chunks = []
    original_chunks = []
    segment_ids = []

    for sentence in sentences:
        clean = normalize(sentence)

        if clean:
            clean_chunks.append(clean)
            original_chunks.append(sentence.strip())
            segment_ids.append(segment_counter)
            segment_counter += 1

    block["chunks"] = clean_chunks
    block["original_chunks"] = original_chunks
    block["segment_ids"] = segment_ids

    return block, segment_counter


def process_docling_json(data, fitz_doc, pages_cache, segment_counter=0):
    if isinstance(data, dict):
        data, segment_counter = process_block(data, segment_counter, fitz_doc, pages_cache)

        new_data = {}
        for key, value in data.items():
            new_value, segment_counter = process_docling_json(value, fitz_doc, pages_cache, segment_counter)
            new_data[key] = new_value

        return new_data, segment_counter

    elif isinstance(data, list):
        new_list = []
        for item in data:
            new_item, segment_counter = process_docling_json(item, fitz_doc, pages_cache, segment_counter)
            new_list.append(new_item)

        return new_list, segment_counter

    return data, segment_counter


def parse_document(file_path: str):
    try:
        docling_json = converter.convert(file_path).document.export_to_dict()
        
        fitz_doc = None
        try:
            fitz_doc = fitz.open(file_path)
        except Exception as e:
            print("Warning: fitz failed to open document for styling", e)
            
        pages_cache = {}
        processed, total_segments = process_docling_json(docling_json, fitz_doc, pages_cache)

        if fitz_doc:
            fitz_doc.close()

        flags = {
            "file_processed": True,
            "text_extracted": True,
            "segments_created": total_segments > 0
        }

        return {
            "data": processed,
            "total_segments": total_segments,
            "flags": flags
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "data": None,
            "flags": {
                "file_processed": False,
                "error": str(e)
            }
        }