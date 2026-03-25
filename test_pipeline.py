import os
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_process():
    test_file_path = "dummy_test.md"
    markdown_content = """# Strategic Overview
We love building the frontend! Actually, the front-end is quite hard.
## core objectives
We need to send an e-mail to the e mail list.
"""
    with open(test_file_path, "w") as f:
        f.write(markdown_content)
    
    try:
        with open(test_file_path, "rb") as f:
             response = client.post("/process", files={"file": ("dummy_test.md", f, "text/markdown")})
        
        print("Status Code:", response.status_code)
        import json
        print(json.dumps(response.json(), indent=2))
    finally:
        if os.path.exists(test_file_path):
            os.remove(test_file_path)

if __name__ == "__main__":
    test_process()
