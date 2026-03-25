def extract_sentences(data):
    sentences = []

    def traverse(node):
        if isinstance(node, dict):
            label = node.get("label", None)
            if "original_chunks" in node:
                segment_ids = node.get("segment_ids", [])
                for i, chunk in enumerate(node["original_chunks"]):
                    seg_id = segment_ids[i] if i < len(segment_ids) else None
                    sentences.append({"text": chunk, "label": label, "seg_id": seg_id})

            for value in node.values():
                traverse(value)

        elif isinstance(node, list):
            for item in node:
                traverse(item)

    traverse(data)
    return sentences