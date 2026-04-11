import { useRef } from 'react';
import { Upload, FileText, Sparkles, PenTool, CheckCircle2 } from 'lucide-react';
import './UploadScreen.css';

export default function UploadScreen({ onUpload, setValidationData }) {
  const fileInputRef = useRef(null);

  const processDocument = async (file) => {
    onUpload(file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const [response] = await Promise.all([
        fetch('http://127.0.0.1:8000/process', {
          method: 'POST',
          body: formData,
        }),
        new Promise(resolve => setTimeout(resolve, 1500))
      ]);

      const data = await response.json();
      setValidationData(data);
    } catch (error) {
      console.error("Error uploading document:", error);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      processDocument(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      processDocument(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="upload-container animate-fade-in">
      <div className="upload-header">
        <div className="upload-icon-wrapper">
          <FileText size={32} />
        </div>
        <h1 className="upload-title">AI-Powered Translation Tool</h1>
        <p className="upload-subtitle">Upload your document to detect and resolve quality issues with AI-powered assistance</p>
      </div>

      <div
        className="drop-zone"
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".pdf,.docx,.txt,.md"
          onChange={handleFileChange}
        />
        <div className="drop-icon-wrapper">
          <Upload size={40} />
        </div>
        <h3 className="drop-text">Drag and drop your file here</h3>
        <p className="drop-or">or</p>
        <button className="browse-btn" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
          Browse Files
        </button>
        <p className="supported-formats">Supported formats: PDF, DOCX, TXT (Max 50MB)</p>
      </div>

      <div className="features-grid">
        <div className="feature-card feature-ai">
          <Sparkles size={24} /> AI-Powered Detection
        </div>
        <div className="feature-card feature-manual">
          <PenTool size={24} /> Manual Editing
        </div>
        <div className="feature-card feature-qa">
          <CheckCircle2 size={24} /> Quality Assurance
        </div>
      </div>
    </div>
  );
}
