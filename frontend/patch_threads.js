const fs = require('fs');
const file = 'src/components/AcsacDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix the Status Clarification Thread (lines 331-342)
const statusClarificationStartStr = `{st.clarification_is_open !== false ? (
                      <div style={{ fontSize: '11px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {st.clarification_thread && st.clarification_thread.length > 0 && (
                          <div><strong>Clarifications:</strong> <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>Received ({st.clarification_thread.length})</span></div>
                        )}
                        <button onClick={() => handleCloseStatusClarification(st.id)} style={{ padding: '2px 6px', fontSize: '10px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-dim)', borderRadius: '4px', cursor: 'pointer' }}>Close Thread</button>
                      </div>
                    ) : (
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px', fontStyle: 'italic' }}>
                        🔒 Clarification Thread Closed
                      </div>
                    )}`;

const statusClarificationReplacement = `{selectedIntel.type === 'Advisory' && (
                      <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed var(--border-color)' }}>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div>💬 Clarification Thread ({st.clarification_thread?.length || 0})</div>
                          {st.clarification_is_open !== false && (
                            <button onClick={() => handleCloseStatusClarification(st.id)} style={{ padding: '2px 8px', fontSize: '11px', background: 'var(--alert-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close Thread</button>
                          )}
                        </div>
                        
                        {st.clarification_thread && st.clarification_thread.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px', maxHeight: '200px', overflowY: 'auto', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                            {st.clarification_thread.map((msg, mIdx) => (
                              <div key={mIdx} style={{ fontSize: '12px', padding: '8px 10px', borderRadius: '6px', background: msg.sender_org === 'ACSAC' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.05)', borderLeft: msg.sender_org === 'ACSAC' ? '3px solid #3b82f6' : '3px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px', color: 'var(--text-dim)' }}>
                                  <span><strong>{msg.sender_name}</strong> ({msg.sender_org})</span>
                                  <span>{new Date(msg.created_at).toLocaleString()}</span>
                                </div>
                                <div style={{ color: 'var(--text-color)', whiteSpace: 'pre-wrap' }}>{msg.message}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: '10px' }}>
                            No clarification messages yet.
                          </div>
                        )}

                        {st.clarification_is_open !== false ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                            <input
                              type="text"
                              placeholder="Enter clarification message..."
                              className="field-input"
                              style={{ flex: 1, padding: '8px 12px', fontSize: '12px', boxSizing: 'border-box', height: '34px' }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.target.value.trim()) {
                                  e.preventDefault();
                                  handleSendStatusClarification(selectedIntel.id, st.id, e.target.value.trim());
                                  e.target.value = '';
                                }
                              }}
                            />
                            <button
                              className="submit-btn"
                              style={{ width: 'auto', minWidth: '80px', padding: '0 16px', height: '34px', fontSize: '11px', margin: 0, whiteSpace: 'nowrap' }}
                              onClick={(e) => {
                                const input = e.currentTarget.previousElementSibling;
                                if (input && input.value.trim()) {
                                  handleSendStatusClarification(selectedIntel.id, st.id, input.value.trim());
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
                    )}`;

content = content.replace(statusClarificationStartStr, statusClarificationReplacement);

// 2. Remove redundant response clarification top part (lines 463-468)
const redundantClarificationStr = `{resp.clarification_thread && resp.clarification_thread.length > 0 && resp.clarification_is_open && (
                              <div style={{ fontSize: '11px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div><strong>Clarifications:</strong> <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>Received ({resp.clarification_thread.length})</span></div>
                                <button onClick={() => handleCloseResponseClarification(resp.id)} style={{ padding: '2px 6px', fontSize: '10px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-dim)', borderRadius: '4px', cursor: 'pointer' }}>Close Thread</button>
                              </div>
                            )}`;

content = content.replace(redundantClarificationStr, '');

// 3. Fix Response Clarification Thread (lines 488-495)
const responseClarificationStartStr = `{/* Clarification Thread Section */}
                          {selectedIntel.type === 'Alert' && (
                            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed var(--border-color)' }}>
                              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>💬 Clarification Thread ({resp.clarification_thread?.length || 0})</div>
                                {resp.clarification_is_open !== false && (
                                  <button onClick={() => handleCloseResponseClarification(resp.id)} style={{ padding: '2px 8px', fontSize: '11px', background: 'var(--alert-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close Thread</button>
                                )}
                              </div>`;

const responseClarificationReplacement = `{/* Clarification Thread Section */}
                          {selectedIntel.type === 'Alert' && (
                            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed var(--border-color)' }}>
                              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div>💬 Clarification Thread ({resp.clarification_thread?.length || 0})</div>
                                {resp.clarification_is_open !== false && (
                                  <button onClick={() => handleCloseResponseClarification(resp.id)} style={{ padding: '2px 8px', fontSize: '11px', background: 'var(--alert-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close Thread</button>
                                )}
                              </div>`;

content = content.replace(responseClarificationStartStr, responseClarificationReplacement);

fs.writeFileSync(file, content);
console.log("Done patching AcsacDashboard");
