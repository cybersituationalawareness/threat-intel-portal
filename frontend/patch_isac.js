const fs = require('fs');
const file = 'src/components/IsacDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const startStr = `<h4 style={{ margin: '0 0 10px 0', color: 'var(--text-dim)' }}>Indicators (IOCs)</h4>`;
const endStr = `                      e.target.value = '';`;

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `<h4 style={{ margin: '0 0 10px 0', color: 'var(--text-dim)' }}>Indicators (IOCs)</h4>
                  <pre style={{ margin: 0, fontSize: '12px', color: '#ff7b72', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{selectedSubmission.indicators}</pre>
                </div>
              )}

              {/* Clarification Thread Section */}
              <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed var(--border-color)' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  💬 Clarification Thread ({selectedSubmission.comments?.length || 0})
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
`;
  
  content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
  fs.writeFileSync(file, content);
  console.log("Replaced successfully!");
} else {
  console.log("Could not find start or end strings.");
}
