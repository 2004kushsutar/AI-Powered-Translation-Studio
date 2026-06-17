import { useState, useEffect } from 'react';
import { FileText, Save, Download, Undo, Redo, FastForward, CheckCircle2, Target, Languages, ArrowRightLeft, Sparkles, RefreshCw, Edit2, Upload } from 'lucide-react';
import './TranslationStudio.css';

export default function TranslationStudio({ data, fileName, onSwitchMode }) {
  const [selectedSegmentId, setSelectedSegmentId] = useState(1);
  const [filter, setFilter] = useState('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [liveData, setLiveData] = useState(data);
  const [sourceLang, setSourceLang] = useState('English');
  const [targetLang, setTargetLang] = useState('Hindi');
  const [glossaryText, setGlossaryText] = useState('');

  const [segments, setSegments] = useState([]);


  const resolveRef = (refStr, rootNode) => {
    if (!refStr || !rootNode) return null;
    const parts = refStr.replace('#/', '').split('/');
    let current = rootNode;
    for (const part of parts) {
      if (current[part] !== undefined) {
        current = current[part];
      } else {
        return null;
      }
    }
    return current;
  };

  const extractSegments = (node, rootNode, targetObj, counter, issuesList = []) => {
    if (!node) return;

    if (node.$ref) {
      const resolved = resolveRef(node.$ref, rootNode);
      if (resolved) extractSegments(resolved, rootNode, targetObj, counter, issuesList);
      return;
    }

    if (typeof node === 'object' && (node.corrected_chunks || node.original_chunks)) {
      const chunks = node.corrected_chunks || node.original_chunks;
      const segIds = node.segment_ids || [];

      chunks.forEach((chunk, idx) => {
        if (chunk && chunk.trim()) {
          let finalChunk = chunk;

          if (!node.corrected_chunks && segIds[idx] !== undefined) {
            const segId = segIds[idx];
            const segIssues = issuesList.filter(i => i.affected_segments?.includes(segId));

            segIssues.forEach(issue => {
              if (issue.ai_suggested_fix && issue.detected_text) {
                if (issue.ai_suggested_fix === "(Remove word)") {
                  const removePattern = new RegExp(`\\s*\\b${issue.detected_text}\\b\\s*`);
                  finalChunk = finalChunk.replace(removePattern, ' ');
                } else {
                  finalChunk = finalChunk.replace(issue.detected_text, issue.ai_suggested_fix);
                }
              }
            });
          }

          targetObj.push({
            id: counter.id++,
            doclingSegId: segIds[idx],
            type: 'new',
            tmMatch: null,
            status: 'pending',
            source: finalChunk.trim(),
            translation: '',
            confidence: 0
          });
        }
      });
    }

    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(child => extractSegments(child, rootNode, targetObj, counter, issuesList));
    }

    if (node.data?.table_cells && Array.isArray(node.data.table_cells)) {
      node.data.table_cells.forEach(cell => extractSegments(cell, rootNode, targetObj, counter, issuesList));
    }
  };

  useEffect(() => {
    const fetchLatestDocument = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/sourcevalidation");
        if (response.ok) {
          const freshData = await response.json();
          const extracted = [];
          if (freshData?.parsed?.data?.body) {
            const issuesList = freshData.issues || [];
            extractSegments(freshData.parsed.data.body, freshData.parsed.data, extracted, { id: 1 }, issuesList);
          }
          setSegments(extracted);
          setLiveData(freshData);
          setSourceLang(freshData?.source_language || 'en');
          if (extracted.length > 0) setSelectedSegmentId(extracted[0].id);
        } else {
          throw new Error("Failed to fetch");
        }
      } catch (err) {
        console.error("Failed to fetch latest document from MongoDB", err);
        setSegments([
          { id: 1, type: 'exact', tmMatch: 100, status: 'completed', source: 'Introduction to AI-Powered Automation', translation: 'एआई-संचालित स्वचालन का परिचय', confidence: 100 },
          { id: 2, type: 'fuzzy', tmMatch: 85, status: 'pending', source: 'Artificial intelligence has revolutionized the way we approach business automation.', translation: 'आर्टिफिशियल इंटेलिजेंस ने व्यापार स्वचालन को क्रांतिकारी रूप से बदल दिया है।', confidence: 85 }
        ]);
      }
    };

    fetchLatestDocument();
  }, []);

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
    switch (type) {
      case 'exact': return <Target size={14} className="icon-exact" />;
      case 'fuzzy': return <AlertTriangleMockup size={14} className="icon-fuzzy" />;
      case 'new': return <Sparkles size={14} className="icon-new" />;
      default: return null;
    }
  };

  const getBadgeClass = (type) => `tm-badge tm-badge-${type}`;

  const parseGlossary = (text) => {
    if (!text || !text.trim()) return [];
    return text.split('\n').map(line => {
      const parts = line.split(':');
      if (parts.length >= 2) {
        return { term: parts[0].trim(), translation: parts[1].trim() };
      }
      return null;
    }).filter(Boolean);
  };

  const handleGlossaryUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target.result;
      if (file.name.endsWith(".json")) {
        try {
          const parsed = JSON.parse(content);
          const lines = Object.entries(parsed).map(([k, v]) => `${k} : ${v}`);
          setGlossaryText(prev => prev ? prev + "\n" + lines.join("\n") : lines.join("\n"));
        } catch (err) {
          alert("Invalid JSON glossary format.");
        }
      } else if (file.name.endsWith(".csv")) {
        const lines = content.split('\n').slice(1);
        const formatted = lines.map(l => {
          const parts = l.split(',');
          if (parts.length >= 2) return `${parts[0].trim()} : ${parts[1].trim()}`;
          return null;
        }).filter(Boolean);
        setGlossaryText(prev => prev ? prev + "\n" + formatted.join("\n") : formatted.join("\n"));
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const handleAutoFill = async () => {
    setIsProcessing(true);
    const newSegments = [...segments];


    const queries = [];
    const queryMap = {};

    for (let i = 0; i < newSegments.length; i++) {
      const seg = newSegments[i];
      if (seg.status !== 'completed' && seg.type === 'new') {
        queries.push(seg.source);
        queryMap[seg.source] = seg;
      }
    }

    if (queries.length > 0) {
      try {
        const payload = { texts: queries, sourceLang: sourceLang, lang: targetLang, glossary: parseGlossary(glossaryText) };

        const response = await fetch("http://127.0.0.1:4000/api/v1/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();


          const applyData = (arr, newType) => {
            if (!arr) return;
            arr.forEach(match => {
              const seg = queryMap[match.text];
              if (seg) {
                seg.translation = match.suggested_translation || match.translation || "Translated";
                seg.confidence = match.tm_score ? Math.round(match.tm_score * 100) : 95;
                seg.type = newType;
                seg.tmMatch = newType === 'exact' ? 100 : (newType === 'fuzzy' ? seg.confidence : null);
              }
            });
          };

          applyData(data.exact, 'exact');
          applyData(data.fuzzy, 'fuzzy');
          applyData(data.new, 'new');
        } else {
          console.error("API Error", response.status);
          alert("Translation API returned an error. Check console.");
        }
      } catch (e) {
        console.error("TM Match Error", e);
        alert("Network error contacting Translation TM.");
      }
    }

    setSegments(newSegments);
    setIsProcessing(false);
  };

  const handleRegenerate = async (seg) => {
    if (!seg) return;
    setIsRegenerating(true);
    try {
      const payload = { texts: [seg.source], sourceLang: sourceLang, lang: targetLang, glossary: parseGlossary(glossaryText) };
      const response = await fetch("http://127.0.0.1:4000/api/v1/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const data = await response.json();
        let matchedObj = null;
        let newType = 'new';
        if (data.exact && data.exact.length > 0) { matchedObj = data.exact[0]; newType = 'exact'; }
        else if (data.fuzzy && data.fuzzy.length > 0) { matchedObj = data.fuzzy[0]; newType = 'fuzzy'; }
        else if (data.new && data.new.length > 0) { matchedObj = data.new[0]; newType = 'new'; }

        if (matchedObj) {
          setSegments(prev => prev.map(s => {
            if (s.id === seg.id) {
              const conf = matchedObj.tm_score ? Math.round(matchedObj.tm_score * 100) : 95;
              return {
                ...s,
                translation: matchedObj.suggested_translation || matchedObj.translation || "Translated",
                confidence: conf,
                type: newType,
                tmMatch: newType === 'exact' ? 100 : (newType === 'fuzzy' ? conf : null)
              };
            }
            return s;
          }));
        }
      } else {
        alert("Failed to regenerate translation.");
      }
    } catch (e) {
      console.error(e);
      alert("Network error Regenerating AI.");
    }
    setIsRegenerating(false);
  };

  const handleDownload = () => {

    if (!showExport) {
      setShowExport(true);
      setTimeout(() => window.print(), 300);
    } else {
      window.print();
    }
  };


  const renderDocument = (node, index = 0, rootNode = liveData?.parsed?.data) => {
    if (!node) return null;

    if (node.$ref) {
      const resolved = resolveRef(node.$ref, rootNode);
      if (!resolved) return null;
      return renderDocument(resolved, index, rootNode);
    }

    if (node === rootNode && node.body && Array.isArray(node.body.children)) {
      return (
        <div key="root-body" className="doc-body" contentEditable={true} suppressContentEditableWarning={true}>
          {node.body.children.map((childObj, i) => renderDocument(childObj, i, rootNode))}
        </div>
      );
    }

    if (node.label === 'table' || node.type === 'table') {
      const cells = node.data?.table_cells || [];
      if (cells.length === 0) return null;

      const maxRowIdx = Math.max(...cells.map(c => c.end_row_offset_idx || 0));
      const rows = [];
      for (let r = 0; r <= maxRowIdx; r++) {
        const rowCells = cells.filter(c => c.start_row_offset_idx === r);
        rowCells.sort((a, b) => (a.start_col_offset_idx || 0) - (b.start_col_offset_idx || 0));
        rows.push(rowCells);
      }

      return (
        <table className="doc-table-grid" key={index}>
          <tbody>
            {rows.map((rowCells, rIdx) => (
              <tr key={rIdx}>
                {rowCells.map((cell, cIdx) => (
                  <td
                    key={cIdx}
                    colSpan={cell.col_span || 1}
                    rowSpan={cell.row_span || 1}
                    className={cell.column_header ? "doc-table-header" : "doc-table-cell"}
                  >
                    {renderDocument({ ...cell, label: 'table_cell' }, `${rIdx}-${cIdx}`, rootNode)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (typeof node === 'object' && (node.original_chunks !== undefined || node.corrected_chunks !== undefined)) {
      const label = node.label || 'text';
      const reactStyle = node.style ? {
        fontFamily: node.style.fontFamily !== 'inherit' ? node.style.fontFamily : undefined,
        fontSize: node.style.fontSize ? `${node.style.fontSize}px` : undefined,
        color: node.style.color || undefined,
        textAlign: node.style.textAlign || undefined
      } : {};

      const chunksSource = node.corrected_chunks || node.original_chunks || [];
      const segIds = node.segment_ids || [];
      const contentChunks = chunksSource.map((chunk, i) => {
        const doclingId = segIds[i];
        let matchedSeg;

        if (doclingId !== undefined) {
          matchedSeg = segments.find(s => s.doclingSegId === doclingId);
        } else {
          matchedSeg = segments.find(s => s.source === chunk.trim() || chunk.includes(s.source));
        }


        let displayText = matchedSeg && matchedSeg.translation && matchedSeg.translation.trim() !== ''
          ? matchedSeg.translation
          : chunk;


        if (displayText === chunk && !node.corrected_chunks && liveData?.issues) {
          const segIssues = liveData.issues.filter(issue => issue.affected_segments?.includes(doclingId));
          segIssues.forEach(issue => {
            if (issue.ai_suggested_fix && issue.detected_text) {
              if (issue.ai_suggested_fix === "(Remove word)") {
                const removePattern = new RegExp(`\\s*\\b${issue.detected_text}\\b\\s*`);
                displayText = displayText.replace(removePattern, ' ');
              } else {
                displayText = displayText.replace(issue.detected_text, issue.ai_suggested_fix);
              }
            }
          });
        }

        return <span key={i}>{displayText} </span>;
      });

      if (label === 'title') return <h1 key={index} className="doc-title" style={reactStyle}>{contentChunks}</h1>;
      if (label === 'section_header') return <h2 key={index} className="doc-header" style={reactStyle}>{contentChunks}</h2>;
      if (label === 'list_item') return <li key={index} className="doc-list-item" style={reactStyle}>{contentChunks}</li>;
      if (label === 'table_cell') return <div key={index} style={reactStyle}>{contentChunks}</div>;

      return <p key={index} className="doc-paragraph" style={reactStyle}>{contentChunks}</p>;
    }

    if (node.children && Array.isArray(node.children) && node.children.length > 0) {
      if (node.label === 'list') {
        return (
          <ul key={index} className="doc-list pl-6 list-none my-2">
            {node.children.map((childObj, i) => renderDocument(childObj, i, rootNode))}
          </ul>
        );
      }

      return (
        <div key={index} className="node-group">
          {node.children.map((childObj, i) => renderDocument(childObj, i, rootNode))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="translation-container animate-fade-in">
      {/* Global App header simulating routing tabs */}
      <div className="global-app-bar">
        <div className="global-logo">
          <Languages size={22} className="text-white" /> AI-Powered Translation Studio
        </div>
        <div className="global-tabs">
          <button className="global-tab" onClick={() => onSwitchMode('dashboard')}>
            <FileText size={16} /> Quality Validation
          </button>
          <button className="global-tab active">
            <Languages size={16} /> Translation Mode
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
            <select className="lang-dropdown" value={sourceLang} onChange={(e) => setSourceLang(e.target.value)}>
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="hi">Hindi</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
              <option value="ru">Russian</option>
            </select>
            <ArrowRightLeft size={16} className="text-gray-400" />
            <select className="lang-dropdown" value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="hi">Hindi</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
              <option value="ru">Russian</option>
            </select>
          </div>

          <button
            className="btn-secondary ml-4"
            onClick={handleAutoFill}
            disabled={isProcessing}
            style={{ opacity: isProcessing ? 0.6 : 1, cursor: isProcessing ? 'not-allowed' : 'pointer' }}
          >
            <FastForward size={16} /> {isProcessing ? 'Processing...' : 'Translate'}
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
          <button className="header-btn" onClick={() => setShowExport(!showExport)}>
            <Save size={18} /> {showExport ? "Close Export" : "Export View"}
          </button>
          <button className="export-btn" onClick={handleDownload}><Download size={18} /> Download File</button>
        </div>
      </header>

      {showExport ? (
        <main className="export-full-view">
          <div className="export-banner">
            <h3>Full Document Preview</h3>
            <p>You can freely click and edit the translated text below. Your changes remain formatted.</p>
          </div>
          <div className="document-viewer print-container">
            <div className="document-page print-page">
              {liveData?.parsed?.data ? renderDocument(liveData.parsed.data, 0) : <p className="text-center">No document parsed data.</p>}
            </div>
          </div>
        </main>
      ) : (
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
            <div className="glossary-section mb-6 p-5 rounded-xl bg-white border border-gray-200 shadow-sm transition hover:shadow-md">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
                  <FileText size={16} />
                </div>
                <h3 className="text-sm font-bold text-gray-800">Project Glossary</h3>
              </div>
              <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                Enforce localized terminology constraints. Paste rules below or upload a file.
              </p>

              <div className="relative mb-3">
                <textarea
                  className="w-full text-sm p-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all resize-y shadow-inner outline-none"
                  rows={3}
                  placeholder="e.g., PM : Project Manager"
                  value={glossaryText}
                  onChange={(e) => setGlossaryText(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  {glossaryText ? `${glossaryText.split('\n').filter(l => l.includes(':')).length} Active Rules` : 'No Rules'}
                </span>
                <label className="text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all flex items-center shadow-sm">
                  <Upload size={14} className="mr-1.5" /> Upload File
                  <input type="file" accept=".json,.csv" onChange={handleGlossaryUpload} className="hidden" />
                </label>
              </div>
            </div>
            <br />

            <div className="details-header">
              <h3>Segment Details</h3>
            </div>

            {selectedSegment ? (
              <div className="details-content animate-fade-in">
                <div className="field-group">
                  <div className="field-label flex-between">
                    Source Text ({sourceLang})
                  </div>
                  <div className="field-box box-neutral">{selectedSegment.source}</div>
                </div>

                <div className="field-group mt-5">
                  <div className="field-label text-primary-blue flex-between">
                    <span className="flex items-center gap-1"><Sparkles size={14} /> AI Translation Suggestion</span>
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
                  <button
                    className="btn-outline w-full mt-3"
                    onClick={() => handleRegenerate(selectedSegment)}
                    disabled={isRegenerating}
                  >
                    <RefreshCw size={18} className={isRegenerating ? 'rotating' : ''} />
                    {isRegenerating ? 'Regenerating...' : 'Regenerate AI'}
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
      )}
    </div>
  );
}


function AlertTriangleMockup({ size, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  );
}
