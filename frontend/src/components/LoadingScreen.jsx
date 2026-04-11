import { useEffect, useState } from 'react';
import { CheckCircle2, Info, Sparkles } from 'lucide-react';
import './LoadingScreen.css';

export default function LoadingScreen({ fileName, onStart }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(100);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="loading-container animate-fade-in">
      <div className="loading-card">
        <div className="success-icon-wrapper animate-slide-up">
          <CheckCircle2 size={32} />
        </div>

        <h2 className="loading-title">File Uploaded Successfully</h2>
        <p className="loading-subtitle">{fileName || 'Document.pdf'}</p>

        <div className="progress-wrapper">
          <div className="progress-labels">
            <span>Upload Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        {progress === 100 && (
          <div className="info-box animate-slide-up">
            <Info className="info-icon" size={20} />
            <div className="info-text">
              <h4>Ready for Analysis</h4>
              <p>Our AI will scan your document for spelling errors, grammatical mistakes, terminology inconsistencies, and formatting issues.</p>
            </div>
          </div>
        )}

        <div className="loading-actions">
          <button className="btn-secondary" onClick={() => window.location.reload()}>
            Upload Different File
          </button>
          <button
            className="btn-primary"
            onClick={onStart}
            disabled={progress < 100}
          >
            <Sparkles size={18} /> Start Analysis
          </button>
        </div>
      </div>
    </div>
  );
}
