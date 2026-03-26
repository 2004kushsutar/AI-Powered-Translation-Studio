import { useState, useEffect } from 'react';
import { FileText, Save, Download, Undo, Redo, AlertCircle, CheckCircle2, AlertTriangle, Info, Edit2, X } from 'lucide-react';
import './DashboardStudio.css';

export default function DashboardStudio({ data, fileName, onSwitchMode }) {
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  
  // Track issues with an added 'status' flag ('active' | 'resolved')
  const [issuesData, setIssuesData] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [customEditText, setCustomEditText] = useState("");

  // History state for Undo/Redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    if (data?.issues) {
      const initialIssues = data.issues.map(i => ({ ...i, status: 'active' }));
      setIssuesData(initialIssues);
      setHistory([initialIssues]);
      setHistoryIndex(0);
    }
  }, [data]);

  const activeIssues = issuesData.filter(i => i.status === 'active');
  const selectedIssue = issuesData.find(i => i.id === selectedIssueId);

  const stats = {
    high: activeIssues.filter(i => i.severity === 'high').length,
    medium: activeIssues.filter(i => i.severity === 'medium').length,
    low: activeIssues.filter(i => i.severity === 'low').length,
    resolved: issuesData.filter(i => i.status === 'resolved').length
  };

  const parsed = data?.parsed?.data; // from docling parser

  const pushStateToHistory = (newIssuesData) => {
    setHistory(prev => {
       const newHistory = prev.slice(0, historyIndex + 1);
       newHistory.push(newIssuesData);
       return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  };

  const resolveIssue = (id, replacementText) => {
    const newIssuesData = issuesData.map(issue => {
      if (issue.id === id) {
        return { ...issue, status: 'resolved', resolvedTo: replacementText };
      }
      return issue;
    });
    
    setIssuesData(newIssuesData);
    pushStateToHistory(newIssuesData);
    
    setSelectedIssueId(null);
    setIsEditing(false);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setIssuesData(history[prevIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setIssuesData(history[nextIndex]);
    }
  };

  const handleAccept = (issue) => {
    const fixText = (issue.ai_suggested_fix === "(Remove word)") 
      ? "" 
      : issue.ai_suggested_fix;
    resolveIssue(issue.id, fixText);
  };

  const handleReject = (issue) => {
    resolveIssue(issue.id, issue.detected_text); // replace with original text
  };

  const handleEdit = (issue) => {
    if (isEditing) {
      resolveIssue(issue.id, customEditText);
    } else {
      setCustomEditText(issue.detected_text);
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issues: issuesData })
      });
      const result = await response.json();
      if (result.status === 'success') {
        alert('Changes saved! The backend JSON now has `corrected_chunks` attached securely to every block.');
      } else {
        alert('Failed to save document: ' + result.message);
      }
    } catch (error) {
       console.error(error);
       alert("Network error connecting to the backend to save the file.");
    }
  };

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

  // Helper to render text chunks seamlessly mapped to appropriate semantic layout blocks
  const renderDocument = (node, index = 0, rootNode = parsed) => {
    if (!node) return null;

    // Resolve JSON pointers maintaining chronological document reading order
    if (node.$ref) {
      const resolved = resolveRef(node.$ref, rootNode);
      if (!resolved) return null;
      return renderDocument(resolved, index, rootNode);
    }

    // Document Root
    if (node === rootNode && node.body && Array.isArray(node.body.children)) {
      return (
        <div key="root-body" className="doc-body">
          {node.body.children.map((childObj, i) => renderDocument(childObj, i, rootNode))}
        </div>
      );
    }
    
    // Explicit 2D Table Rendering Map
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
    
    // Standard Content Extraction
    if (typeof node === 'object' && node.original_chunks) {
      const label = node.label || 'text';
      const nodeStyle = node.style || {};
      
      const reactStyle = {
         fontFamily: nodeStyle.fontFamily !== 'inherit' ? nodeStyle.fontFamily : undefined,
         fontSize: nodeStyle.fontSize ? `${nodeStyle.fontSize}px` : undefined,
         color: nodeStyle.color || undefined
      };
      
      const contentChunks = node.original_chunks.map((chunk, i) => {
        const seg_id = node.segment_ids ? node.segment_ids[i] : null;
        
        // Find all issues for this segment
        const segmentIssues = issuesData.filter(issue => issue.affected_segments?.includes(seg_id));
        
        // Apply resolved text replacements
        let displayText = chunk;
        segmentIssues.forEach(issue => {
          if (issue.status === 'resolved' && issue.resolvedTo !== undefined && issue.detected_text) {
            if (issue.resolvedTo === "") {
              // If removing a word completely, cleanly swallow the trailing whitespace
              const removePattern = new RegExp(`\\s*\\b${issue.detected_text}\\b\\s*`);
              displayText = displayText.replace(removePattern, ' ');
            } else {
              displayText = displayText.replace(issue.detected_text, issue.resolvedTo);
            }
          }
        });

        const activeIssue = segmentIssues.find(i => i.status === 'active');
        
        if (activeIssue) {
          return (
            <span 
              key={i} 
              className={`highlight highlight-${activeIssue.severity} ${selectedIssueId === activeIssue.id ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIssueId(activeIssue.id);
                setIsEditing(false);
              }}
            >
              {displayText}{' '}
            </span>
          );
        }
        return <span key={i}>{displayText} </span>;
      });

      // Render the correct structural tag for document authenticity formatting
      if (label === 'title') {
        return <h1 key={index} className="doc-title" style={reactStyle}>{contentChunks}</h1>;
      }
      if (label === 'section_header') {
        return <h2 key={index} className="doc-header" style={reactStyle}>{contentChunks}</h2>;
      }
      if (label === 'list_item') {
        return <li key={index} className="doc-list-item" style={reactStyle}>{contentChunks}</li>;
      }
      if (label === 'table_cell') {
        return <div key={index} style={reactStyle}>{contentChunks}</div>;
      }
      
      // Default paragraphs
      return <p key={index} className="doc-paragraph" style={reactStyle}>{contentChunks}</p>;
    }
    
    // Nested children structure like Lists
    if (node.children && Array.isArray(node.children) && node.children.length > 0) {
      return (
        <div key={index} className="node-group">
          {node.children.map((childObj, i) => renderDocument(childObj, i, rootNode))}
        </div>
      );
    }

    return null;
  };

  const getIssueIcon = (type) => {
    if (type === 'spelling') return <AlertCircle size={14} />;
    if (type === 'terminology') return <AlertTriangle size={14} />;
    return <Info size={14} />;
  };

  return (
    <div className="dashboard-container animate-fade-in">
      {/* Global App header simulating routing tabs */}
      <div className="global-app-bar" style={{ background: '#5b21b6', color: 'white', padding: '0.5rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontSize: '1.1rem' }}>
          <FileText size={22} color="white"/> AI-Powered Translation Studio
        </div>
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', overflow: 'hidden' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', fontSize: '0.85rem', fontWeight: '500', background: 'white', color: '#5b21b6', border: 'none', cursor: 'pointer' }}>
            <FileText size={16}/> Quality Validation
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', fontSize: '0.85rem', fontWeight: '500', background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', transition: '0.2s' }} onClick={() => typeof onSwitchMode === 'function' && onSwitchMode('translation')}>
            <FileText size={16}/> Translation Mode
          </button>
        </div>
      </div>

      {/* Header Panel */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="doc-name"><FileText size={20} className="text-primary-blue" /> {fileName || 'Document.pdf'}</div>
        </div>
        <div className="header-actions">
          <button 
            className="header-btn" 
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            style={{ opacity: historyIndex <= 0 ? 0.3 : 1, cursor: historyIndex <= 0 ? 'not-allowed' : 'pointer' }}
          >
            <Undo size={18} /> Undo
          </button>
          <button 
            className="header-btn" 
            onClick={handleRedo}
            disabled={history.length === 0 || historyIndex >= history.length - 1}
            style={{ opacity: history.length === 0 || historyIndex >= history.length - 1 ? 0.3 : 1, cursor: history.length === 0 || historyIndex >= history.length - 1 ? 'not-allowed' : 'pointer' }}
          >
            <Redo size={18} /> Redo
          </button>
          <button className="header-btn" onClick={handleSave}><Save size={18} /> Save</button>
          <button className="export-btn"><Download size={18} /> Export</button>
        </div>
      </header>

      <main className="dashboard-content">
        {/* Left Sidebar: Issues List */}
        <aside className="sidebar-left">
          <div className="stats-container">
            <h3 className="font-semibold mb-2">Quality Issues</h3>
            <div className="stats-grid">
              <div className="stat-box stat-high">
                <div className="text-sm">High</div>
                <div className="stat-val">{stats.high}</div>
              </div>
              <div className="stat-box stat-medium">
                <div className="text-sm">Medium</div>
                <div className="stat-val">{stats.medium}</div>
              </div>
              <div className="stat-box stat-low">
                <div className="text-sm">Low</div>
                <div className="stat-val">{stats.low}</div>
              </div>
              <div className="stat-box stat-resolved">
                <div className="text-sm">Resolved</div>
                <div className="stat-val">{stats.resolved}</div>
              </div>
            </div>
          </div>
          
          <div className="issues-list">
            {activeIssues.map(issue => (
              <div 
                key={issue.id} 
                className={`issue-card-preview ${selectedIssueId === issue.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedIssueId(issue.id);
                  setIsEditing(false);
                }}
              >
                <div className={`issue-badge badge-${issue.issue_type}`}>
                  {getIssueIcon(issue.issue_type)} {issue.issue_type}
                </div>
                <div className="issue-detected">{issue.detected_text}</div>
                <div className="issue-fix">→ {issue.ai_suggested_fix}</div>
              </div>
            ))}
            {activeIssues.length === 0 && (
              <div className="text-center text-gray-400 mt-20">No active issues found! 🎉</div>
            )}
          </div>
        </aside>

        {/* Center Panel: Document Viewer */}
        <div className="document-viewer">
          <div className="document-page">
            {parsed ? renderDocument(parsed, 0) : <p className="text-center text-gray-400 mt-20">Parsing Error or Missing Document Content Data.</p>}
          </div>
        </div>

        {/* Right Sidebar: Issues Action Center */}
        <aside className="sidebar-right">
          <div className="details-header">
            <h3>Issue Details</h3>
            <button className="header-btn" onClick={() => setSelectedIssueId(null)}><X size={20} /></button>
          </div>
          
          {selectedIssue ? (
            <div className="details-content animate-fade-in">
              <div className="badges-row">
                <span className={`issue-badge badge-${selectedIssue.issue_type}`}>{selectedIssue.issue_type.toUpperCase()}</span>
                <span className={`issue-badge badge-spelling`}>{selectedIssue.severity.toUpperCase()} SEVERITY</span>
              </div>
              
              <div className="field-group">
                <div className="field-label">Detected Text</div>
                <div className="field-box box-error">"{selectedIssue.detected_text}"</div>
              </div>
              
              <div className="field-group">
                <div className="field-label">✨ AI Suggested Fix</div>
                <div className="field-box box-success">"{selectedIssue.ai_suggested_fix}"</div>
              </div>
              
              <div className="field-group">
                <div className="field-label">Context</div>
                <div className="field-box box-neutral">{selectedIssue.context}</div>
              </div>
              
              <div className="actions-panel">
                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                     <input 
                       type="text" 
                       value={customEditText}
                       onChange={(e) => setCustomEditText(e.target.value)}
                       style={{ 
                         padding: '0.75rem', 
                         borderRadius: '0.5rem', 
                         border: '1px solid var(--primary-blue)', 
                         width: '100%',
                         fontFamily: 'Inter',
                         outline: 'none'
                       }}
                       autoFocus
                     />
                     <button className="btn-accept" onClick={() => handleEdit(selectedIssue)}>Save Custom Edit</button>
                     <button className="btn-outline" onClick={() => setIsEditing(false)}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <button className="btn-accept" onClick={() => handleAccept(selectedIssue)}>
                      <CheckCircle2 size={18} /> Accept Suggestion
                    </button>
                    <button className="btn-outline" onClick={() => handleEdit(selectedIssue)}>
                      <Edit2 size={18} /> Edit Custom
                    </button>
                    <button className="btn-outline" onClick={() => handleReject(selectedIssue)}>
                      <X size={18} /> Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 mt-20">
              Select an issue from the left panel or click a highlight inside the document viewer to view details.
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
