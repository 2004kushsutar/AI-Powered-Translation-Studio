# AI-Powered-Translation-Studio

An AI-powered translation pipeline and studio application. This project features a full-stack architecture with a React frontend, a Node.js (Express) backend for orchestration, and a Python FastAPI service for AI pipelines.

## Key Features

- **Document Parsing**: Efficiently parse and extract text from various document formats.
- **Document Validation**: Validate document structures and contents before processing.
- **Document Translation**: High-quality AI-powered document translation.
- **Translation Memory**: Store and reuse previously translated segments to improve consistency and speed.
- **Glossary Enforcement**: Ensure domain-specific terminology is translated accurately and consistently.
- **Review and approval layer**: Linguists can review and approve the translated content.
- **Multi-format support**: Download translated content in the same format as the original document.
- **Efficient token usage**: Save tokens by using translation memory and glossary enforcement.

## Project Structure

- `frontend/` - A React frontend built with Vite.
- `backend/` - A Node.js and Express backend integrating with Gemini GenAI, Pinecone (vector database), and Xenova Transformers for AI translation workflows.
- `app/` - A Python FastAPI service for managing the AI translation pipeline and database operations.

## Prerequisites

- **Node.js**: v18 or later recommended (for frontend and Node backend).
- **Python**: 3.9 or later (for FastAPI pipeline).

## Setup Instructions

### 1. Frontend

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server (usually runs on http://localhost:5173):
   ```bash
   npm run dev
   ```

### 2. Node.js Backend

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Ensure you have a `config.env` file configured in the `backend` directory with your necessary API keys (MONGO_URI="<your-mongo-uri>"
MONGO_DB_NAME="<your-mongo-db-name>"
PORT = 4000
NODE_ENV = development
GOOGLE_API_KEY = <your-google-api-key>
PINECONE = <your-pinecone-api-key>).

4. Start the backend development server in watch mode:
   ```bash
   npm run dev
   ```

### 3. Python FastAPI Pipeline

1. At the root of the project, create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
2. Install the required Python packages (using the temporary requirements file):
   ```bash
   pip install -r requirements_tmp.txt
   ```
3. Start the FastAPI server using Uvicorn:
   ```bash
   uvicorn app.main:app --reload
   ```
   *Note: The FastAPI interactive API documentation will be accessible at http://127.0.0.1:8000/docs.*