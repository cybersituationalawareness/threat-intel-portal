import React from 'react';

function IsacDetailDrawer({
  selectedSubmission,
  setSelectedSubmission,
  currentUser,
  handleEditClick,
  handleEscalate,
  handleCloseCommentThread,
  handleSendComment
}) {
  if (!selectedSubmission) return null;

  return (
    <div className="side-drawer-overlay" onClick={() => setSelectedSubmission(null)}>
      <div className="side-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="side-drawer-header">
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{selectedSubmission.title || 'Untitled Insight'}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
              {selectedSubmission.case_id} • {selectedSubmission.submission_type}
              {selectedSubmission.status === 'DRAFT' && (
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.15)', color: 'var(--text-dim)', marginLeft: '8px' }}>
                  DRAFT
                </span>
              )}
            </div>
          </div>
          <button onClick={() => setSelectedSubmission(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
        <div className="side-drawer-content" style={{ padding: '20px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              {selectedSubmission.confidence_level && (
                <div style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', display: 'inline-block' }}>
                  <strong>Confidence:</strong> {selectedSubmission.confidence_level}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {currentUser.id === selectedSubmission.created_by_id && (
                <button className="submit-btn" style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border-color)', fontSize: '12px' }} onClick={handleEditClick}>
                  Edit Insight
                </button>
              )}
              {currentUser.organization.org_type === 'ACSAC' && (
                <button 
                  className="submit-btn" 
                  style={{ 
                    background: selectedSubmission.is_escalated ? 'var(--bg-lighter)' : 'var(--alert-color)', 
                    color: selectedSubmission.is_escalated ? 'var(--text-dim)' : 'white', 
                    padding: '6px 12px',
                    fontSize: '12px',
                    cursor: selectedSubmission.is_escalated ? 'not-allowed' : 'pointer',
                    border: selectedSubmission.is_escalated ? '1px solid var(--border-color)' : 'none'
                  }} 
                  onClick={handleEscalate}
                  disabled={selectedSubmission.is_escalated}
                >
                  {selectedSubmission.is_escalated ? 'Escalated to Alert' : 'Escalate to Alert'}
                </button>
              )}
            </div>
          </div>

          <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
            Shared by <strong>{selectedSubmission.organization?.name}</strong> • Target: <strong>{selectedSubmission.target_org ? (selectedSubmission.target_org.name === 'Platform' ? 'ACSAC' : selectedSubmission.target_org.name) : 'All Member'}</strong> • Sighted on: {new Date(selectedSubmission.sighting_datetime).toLocaleString()}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: 'var(--accent)' }}>Description</h4>
            <p style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '13px', lineHeight: '1.6' }}>
              {selectedSubmission.description}
            </p>
          </div>

          {selectedSubmission.indicators && (
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-dim)' }}>Indicators (IOCs)</h4>
              <pre style={{ margin: 0, fontSize: '12px', color: '#ff7b72', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{selectedSubmission.indicators}</pre>
            </div>
          )}

          {/* Clarification Thread Section */}
          <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed var(--border-color)' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div>💬 Clarification Thread ({selectedSubmission.comments?.length || 0})</div>
              {currentUser.organization.org_type === 'ACSAC' && selectedSubmission.status !== 'CLOSED' && (
                <button onClick={() => handleCloseCommentThread(selectedSubmission.id)} style={{ padding: '2px 8px', fontSize: '11px', background: 'var(--alert-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close Thread</button>
              )}
            </div>
            
            {selectedSubmission.comments && selectedSubmission.comments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px', maxHeight: '200px', overflowY: 'auto', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                {selectedSubmission.comments.map((comment, mIdx) => (
                  <div key={mIdx} style={{ fontSize: '12px', padding: '8px 10px', borderRadius: '6px', background: (comment.organization?.org_type === 'ACSAC' || comment.organization?.name === 'ACSAC') ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.05)', borderLeft: (comment.organization?.org_type === 'ACSAC' || comment.organization?.name === 'ACSAC') ? '3px solid #3b82f6' : '3px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px', color: 'var(--text-dim)' }}>
                      <span><strong>{comment.created_by?.name || 'Member'}</strong> ({comment.organization?.name || 'Organization'})</span>
                      <span>{new Date(comment.created_at).toLocaleString()}</span>
                    </div>
                    <div style={{ color: 'var(--text-color)', whiteSpace: 'pre-wrap' }}>{comment.content}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '10px', fontStyle: 'italic' }}>No clarifications yet.</div>
            )}

            {/* Add Comment Input */}
            {selectedSubmission.status !== 'CLOSED' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                <input
                  type="text"
                  placeholder="Enter clarification..."
                  className="field-input"
                  style={{ flex: 1, padding: '8px 12px', fontSize: '12px', boxSizing: 'border-box', height: '36px' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      e.preventDefault();
                      handleSendComment(selectedSubmission.id, e.target.value.trim());
                      e.target.value = '';
                    }
                  }}
                />
                <button
                  className="submit-btn"
                  style={{ width: 'auto', minWidth: '80px', padding: '0 20px', height: '38px', fontSize: '12px', margin: 0, whiteSpace: 'nowrap' }}
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling;
                    if (input && input.value.trim()) {
                      handleSendComment(selectedSubmission.id, input.value.trim());
                      input.value = '';
                    }
                  }}
                >
                  Send
                </button>
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '10px', fontStyle: 'italic', padding: '10px', background: 'rgba(0,0,0,0.1)', borderRadius: '4px' }}>
                🔒 This clarification thread has been closed.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default IsacDetailDrawer;
