import { useState } from 'react';
import { FileText, Save, Download, Undo, Redo, FastForward, CheckCircle2, Target, Languages, ArrowRightLeft, Sparkles, RefreshCw, Edit2 } from 'lucide-react';
import './TranslationStudio.css';

export default function TranslationStudio({ fileName, onSwitchMode }) {
  const [selectedSegmentId, setSelectedSegmentId] = useState(3);
  const [filter, setFilter] = useState('all');

  const [segments, setSegments] = useState([
    { id: 1, type: 'exact', tmMatch: 100, status: 'completed', source: 'Introduction to AI-Powered Automation', translation: 'एआई-संचालित स्वचालन का परिचय', confidence: 100 },
    { id: 2, type: 'fuzzy', tmMatch: 85, status: 'pending', source: 'Artificial intelligence has revolutionized the way we approach business automation.', translation: 'आर्टिफिशियल इंटेलिजेंस ने व्यापार स्वचालन को क्रांतिकारी रूप से बदल दिया है।', confidence: 85 },
    { id: 3, type: 'new', tmMatch: null, status: 'pending', source: 'AI-powered automation algorithms are now capable of processing vast amounts of data with unprecedented speed and accuracy.', translation: 'एआई-संचालित स्वचालन एल्गोरिदम अब अभूतपूर्व गति और सटीकता के साथ विशाल मात्रा में डेटा को संसाधित करने में सक्षम हैं।', confidence: 94 },
    { id: 4, type: 'new', tmMatch: null, status: 'pending', source: "Our company's AI system utilizes advanced neural networks to analyze document quality.", translation: 'हमारी कंपनी का एआई सिस्टम दस्तावेज़ गुणवत्ता का विश्लेषण करने के लिए उन्नत न्यूरल नेटवर्क का उपयोग करता है।', confidence: 88 },
    { id: 5, type: 'fuzzy', tmMatch: 78, status: 'pending', source: 'The system can detect spelling errors, grammatical mistakes, and terminology inconsistencies across multiple languages.', translation: 'यह प्रणाली कई भाषाओं में वर्तनी त्रुटियों, व्याकरणिक गलतियों और शब्दावली असंगतियों का पता लगा सकती है।', confidence: 80 }
  ]);

  const stats = {
    exact: segments.filter(s => s.type === 'exact').length,
    fuzzy: segments.filter(s => s.type === 'fuzzy').length,
    newAI: segments.filter(s => s.type === 'new').length,
    completed: segments.filter(s => s.status === 'completed').length,
    total: segments.length
  };

  const progressPercent = Math.round((stats.completed / stats.total) * 100) || 0;

  const filteredSegments = segments.filter(seg => {
    if (filter === 'all') return true;
    if (filter === 'exact') return seg.type === 'exact';
    if (filter === 'fuzzy') return seg.type === 'fuzzy';
    if (filter === 'new') return seg.type === 'new';
    return true;
  });

  const selectedSegment = segments.find(s => s.id === selectedSegmentId);

  const getTypeIcon = (type) => {
    switch(type) {
      case 'exact': return <Target size={14} className="icon-exact" />;
      case 'fuzzy': return <AlertTriangleMockup size={14} className="icon-fuzzy" />;
      case 'new': return <Sparkles size={14} className="icon-new" />;
      default: return null;
    }
  };

  const getBadgeClass = (type) => `tm-badge tm-badge-${type}`;

  return (
    <div className="translation-container animate-fade-in">
      {/* Global App header simulating routing tabs */}
      <div className="global-app-bar">
        <div className="global-logo">
          <Languages size={22} className="text-white"/> AI-Powered Translation Studio
        </div>
        <div className="global-tabs">
          <button className="global-tab" onClick={() => onSwitchMode('dashboard')}>
            <FileText size={16}/> Quality Validation
          </button>
          <button className="global-tab active">
            <Languages size={16}/> Translation Mode
          </button>
        </div>
      </div>

      {/* Translation Header Toolbar */}
      <header className="translation-header">
        <div className="header-left">
          <Languages size={20} className="text-primary-blue" />
          <span className="font-semibold">Translation Mode</span>
          <span className="doc-badge">{fileName || 'document_validated.pdf'}</span>
          
          <div className="lang-selector">
            <select className="lang-dropdown"><option>English</option></select>
            <ArrowRightLeft size={16} className="text-gray-400" />
            <select className="lang-dropdown"><option>Hindi</option><option>Spanish</option><option>French</option></select>
          </div>

          <button className="btn-secondary ml-4">
            <FastForward size={16} /> Auto-fill from TM
          </button>
        </div>

        <div className="header-actions">
          <div className="progress-container">
            <span className="text-sm text-gray-400">{progressPercent}% translated</span>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <span className="text-sm font-semibold">{stats.completed} / {stats.total} segments</span>
          </div>
          <button className="header-btn"><Undo size={18} /> Undo</button>
          <button className="header-btn"><Redo size={18} /> Redo</button>
          <button className="header-btn"><Save size={18} /> Save</button>
          <button className="export-btn"><Download size={18} /> Export</button>
        </div>
      </header>

      <main className="translation-content">
        {/* Left Sidebar: Status & List */}
        <aside className="sidebar-tm-left">
          <div className="stats-tm-container">
            <h3 className="font-semibold mb-3">Translation Status</h3>
            <div className="stats-tm-grid">
              <div className="stat-tm-box box-exact">
                <div className="text-sm">Exact Match</div>
                <div className="stat-tm-val">{stats.exact}</div>
              </div>
              <div className="stat-tm-box box-fuzzy">
                <div className="text-sm">Fuzzy Match</div>
                <div className="stat-tm-val">{stats.fuzzy}</div>
              </div>
              <div className="stat-tm-box box-new">
                <div className="text-sm">New / AI</div>
                <div className="stat-tm-val">{stats.newAI}</div>
              </div>
              <div className="stat-tm-box box-neutral">
                <div className="text-sm">Completed</div>
                <div className="stat-tm-val">{stats.completed}</div>
              </div>
            </div>
          </div>
          
          <div className="segments-filter">
            <select 
              className="filter-dropdown"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All Segments</option>
              <option value="exact">Exact Match</option>
              <option value="fuzzy">Fuzzy Match</option>
              <option value="new">New / AI Generated</option>
            </select>
          </div>

          <div className="segments-list">
            {filteredSegments.map(seg => (
              <div 
                key={seg.id} 
                className={`segment-sidebar-card ${selectedSegmentId === seg.id ? 'active' : ''}`}
                onClick={() => setSelectedSegmentId(seg.id)}
              >
                <div className="seg-card-header">
                  <span className="text-xs font-semibold text-gray-500">#{seg.id}</span>
                  <span className={getBadgeClass(seg.type)}>
                    {seg.type}
                  </span>
                </div>
                <div className="seg-card-text">{seg.source}</div>
              </div>
            ))}
          </div>
        </aside>

        {/* Center Panel: Side-by-side Editor */}
        <div className="translation-viewer">
          {segments.map(seg => (
            <div 
              key={seg.id} 
              className={`translation-row ${selectedSegmentId === seg.id ? 'active-row' : ''} type-${seg.type}`}
              onClick={() => setSelectedSegmentId(seg.id)}
            >
              <div className="row-source">
                <div className="row-header">
                  <span className="row-number">#{seg.id}</span>
                  <span className={getBadgeClass(seg.type)}>
                    {getTypeIcon(seg.type)} {seg.type}
                  </span>
                  {seg.tmMatch && <span className="tm-percent">TM: {seg.tmMatch}%</span>}
                </div>
                <div className="row-text">{seg.source}</div>
              </div>
              
              <div className="row-target">
                <div className="row-header target-header">
                  <span className="target-label">Translation</span>
                  {seg.status === 'completed' && <CheckCircle2 size={16} className="text-success" />}
                </div>
                <div className="row-text">{seg.translation}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Sidebar: Segment Action Center */}
        <aside className="sidebar-tm-right">
          <div className="details-header">
            <h3>Segment Details</h3>
          </div>
          
          {selectedSegment ? (
            <div className="details-content animate-fade-in">
              <div className="field-group">
                <div className="field-label flex-between">
                  Source Text (English)
                </div>
                <div className="field-box box-neutral">{selectedSegment.source}</div>
              </div>
              
              <div className="field-group mt-5">
                <div className="field-label text-primary-blue flex-between">
                  <span className="flex items-center gap-1"><Sparkles size={14}/> AI Translation Suggestion</span>
                </div>
                <div className="field-box box-ai">
                  <div className="confidence-badge">Confidence: {selectedSegment.confidence}%</div>
                  {selectedSegment.translation}
                </div>
              </div>
              
              <div className="actions-panel mt-6">
                 <button className="btn-accept w-full">
                    <CheckCircle2 size={18} /> Accept Suggestion
                 </button>
                 <button className="btn-outline w-full mt-3">
                    <Edit2 size={18} /> Edit Translation
                 </button>
                 <button className="btn-outline w-full mt-3">
                    <RefreshCw size={18} /> Regenerate AI
                 </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 mt-20">
              Select a segment to view translation options.
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

// Simple triangle polyfill for fuzzy icon
function AlertTriangleMockup({ size, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  );
}
