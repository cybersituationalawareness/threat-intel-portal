import React, { useState } from 'react';

function AcsacIntelDetailDrawer({
  selectedIntel,
  onClose,
  handleDownload,
  handleCloseStatusClarification,
  handleCloseResponseClarification,
  handleSendStatusClarification,
  handleSendClarification,
}) {
  const [selectedMemberFilter, setSelectedMemberFilter] = useState('');

  if (!selectedIntel) return null;

  return (
    <div className="side-drawer-overlay" onClick={onClose}>
      <div className="side-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="side-drawer-header">
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{selectedIntel.title}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>{selectedIntel.case_id} • {selectedIntel.type}</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
        <div className="side-drawer-content" style={{ padding: '20px' }}>
          
          {/* Intel Details */}
          <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: '0 0 10px 0', color: 'var(--accent)' }}>Intel Details</h4>
            <div style={{ marginBottom: '10px', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
              <strong>Description:</strong><br/>{selectedIntel.description}
            </div>
            {selectedIntel.threat_data && (
              <div style={{ marginBottom: '10px', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                <strong>Threat Data:</strong><br/>{selectedIntel.threat_data}
              </div>
            )}
            
            {selectedIntel.attachments && selectedIntel.attachments.length > 0 && (
              <div style={{ marginBottom: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {selectedIntel.attachments.map((att, idx) => (
                  <a key={idx} href="#" onClick={(e) => {
                    e.preventDefault();
                    const url = `/api/v1/intel/${selectedIntel.id}/attachment/${encodeURIComponent(att.filename)}`;
                    window.open(url, '_blank');
                  }} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--accent)', textDecoration: 'none', fontSize: '13px', padding: '5px 10px', border: '1px solid var(--accent)', borderRadius: '4px' }}>
                    Download: {att.filename}
                  </a>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '15px', marginTop: '15px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                <strong>Creator:</strong> {selectedIntel.creator_org?.name || 'Sector-Hub'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                <strong>Confidence:</strong> {selectedIntel.confidence}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                <strong>Category:</strong> {selectedIntel.category || 'General'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                <strong>Published:</strong> {selectedIntel.published_at ? new Date(selectedIntel.published_at).toLocaleString() : '-'}
              </div>
            </div>
            {selectedIntel.tags?.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                {selectedIntel.tags.map((tag, i) => (
                  <span key={i} className="tag" style={{ marginRight: '5px' }}>{tag}</span>
                ))}
              </div>
            )}
          </div>

          {/* Member Status Matrix */}
          <h4 style={{ margin: '0 0 10px 0', color: 'var(--accent)' }}>Member Status Matrix</h4>
          {selectedIntel.status === 'DRAFT' || selectedIntel.status === 'PENDING_REVIEW' || selectedIntel.status === 'APPROVED' ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontStyle: 'italic' }}>
              This is a Draft. Member statuses will populate once published.
            </div>
          ) : (
            <>
              {/* Member Filter Dropdown */}
              {selectedIntel.member_statuses && selectedIntel.member_statuses.length > 1 && (
                <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-glass)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                    🔍 Filter by Member:
                  </label>
                  <select
                    value={selectedMemberFilter}
                    onChange={(e) => setSelectedMemberFilter(e.target.value)}
                    className="field-input"
                    style={{ flex: 1, padding: '8px 12px', fontSize: '13px', cursor: 'pointer', background: '#080e1e', color: 'var(--text-color)', border: '1px solid var(--border-normal)', borderRadius: '6px' }}
                  >
                    <option value="">-- Select a Member --</option>
                    {selectedIntel.member_statuses.map(st => (
                      <option key={st.id} value={st.id}>
                        {st.organization.name} [{selectedIntel.type === 'Alert' && st.status === 'UNACKNOWLEDGED' ? 'UNRESPONDED' : st.status}]
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedIntel.member_statuses
                ?.filter(st => selectedIntel.member_statuses.length === 1 || st.id === selectedMemberFilter || !selectedMemberFilter)
                .map(st => (
              <div key={st.id} style={{ background: 'var(--bg-glass)', padding: '10px', marginBottom: '10px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontWeight: 'bold' }}>{st.organization.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Status: {selectedIntel.type === 'Alert' && st.status === 'UNACKNOWLEDGED' ? 'UNRESPONDED' : st.status}</div>
                {selectedIntel.type === 'Advisory' && (
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
                )}
                
                {/* Find responses if any */}
              {(() => {
                const orgResponses = selectedIntel.responses?.filter(r => r.org_id === st.org_id) || [];
                if (orgResponses.length > 0) {
                  // Sort newest first assuming they are appended
                  const sortedResponses = [...orgResponses].reverse();
                  return sortedResponses.map((resp, index) => {
                    let slaBalanceText = null;
                    if (selectedIntel.has_sla && resp.submitted_at && selectedIntel.published_at) {
                      const published = new Date(selectedIntel.published_at);
                      const submitted = new Date(resp.submitted_at);
                      let deadline = new Date(published.getTime());
                      
                      if (selectedIntel.sla_value === 0) {
                        const diffMs = submitted.getTime() - published.getTime();
                        const diffHours = -(diffMs / (1000 * 60 * 60));
                        slaBalanceText = diffHours.toFixed(4);
                      } else {
                        if (selectedIntel.sla_unit === 'day') deadline.setDate(deadline.getDate() + selectedIntel.sla_value);
                        else if (selectedIntel.sla_unit === 'week') deadline.setDate(deadline.getDate() + selectedIntel.sla_value * 7);
                        else if (selectedIntel.sla_unit === 'month') deadline.setMonth(deadline.getMonth() + selectedIntel.sla_value);
                        
                        const diffMs = deadline.getTime() - submitted.getTime();
                        const diffHours = diffMs / (1000 * 60 * 60);
                        
                        if (diffHours >= 0) {
                          slaBalanceText = '0';
                        } else {
                          slaBalanceText = diffHours.toFixed(4);
                        }
                      }
                    }

                    return (
                      <div key={resp.id} style={{ marginTop: '10px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                      {sortedResponses.length > 1 && (
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '5px' }}>Response #{sortedResponses.length - index}</div>
                      )}
                      <div style={{ fontSize: '11px', marginBottom: '5px' }}>
                        <strong>SLA Compliance: </strong> 
                        {resp.sla_met === true && <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>Yes</span>}
                        {resp.sla_met === false && <span style={{ color: 'var(--alert-color)', fontWeight: 'bold' }}>No</span>}
                        {resp.sla_met === null && <span style={{ color: 'var(--text-dim)' }}>N/A</span>}
                        {slaBalanceText !== null && (
                          <div style={{ marginTop: '2px', color: 'var(--text-dim)' }}>
                            <strong>SLA Balance (hrs): </strong> {slaBalanceText}
                          </div>
                        )}
                      </div>
                      {(selectedIntel.type === 'Alert' || selectedIntel.category) ? (
                        <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {resp.affected_member_status && resp.affected_member_status !== 'N/A' && (
                            <div>
                              <strong>Affected Status: </strong>
                              <span style={{ color: resp.affected_member_status === 'No' ? 'var(--alert-color)' : 'var(--success-color)', fontWeight: 'bold' }}>
                                {resp.affected_member_status}
                              </span>
                            </div>
                          )}

                          {resp.affected_member_status !== 'No' && (
                            <>
                              {selectedIntel.category !== 'RFI' && (
                                <>
                                  <div><strong>Environment:</strong> {resp.affected_environment || 'Non-CII'}</div>
                                  {resp.affected_assets && resp.affected_assets.length > 0 && (
                                    <div><strong>Affected Asset / Network:</strong> {resp.affected_assets.join(', ')}</div>
                                  )}
                                  {resp.delay_reason && <div><strong>Delay Reason:</strong> {resp.delay_reason}</div>}
                                  {resp.expected_verification_date && <div><strong>Expected Date:</strong> {resp.expected_verification_date}</div>}
                                </>
                              )}

                              {selectedIntel.category === 'Exploited Vulnerabilities' && (
                                <>
                                  <div><strong>Patch Status:</strong> {resp.patch_status || 'N/A'}</div>
                                  <div><strong>Mitigation Measure:</strong> {resp.mitigation_measure_if_not_patched || 'N/A'}</div>
                                </>
                              )}

                              {(selectedIntel.category === 'Indicator of Compromise' || selectedIntel.category === 'Indicators of Compromise' || selectedIntel.category === 'IOC' || selectedIntel.category === 'IOCs') && (
                                <>
                                  <div><strong>IOC Detected:</strong> {resp.findings || 'NIL'}</div>
                                  <div><strong>IOC Direction:</strong> {resp.ioc_traffic_direction || 'N/A'}</div>
                                  <div><strong>Follow-up Action:</strong> {resp.follow_up_action || 'N/A'}</div>
                                </>
                              )}

                              {selectedIntel.category === 'Campaign' && (
                                <>
                                  <div><strong>Campaign Activity Observed:</strong> {resp.ioc_traffic_direction || 'N/A'}</div>
                                  <div><strong>Defensive Actions:</strong> {resp.follow_up_action || 'N/A'}</div>
                                </>
                              )}

                              {(selectedIntel.category === 'Threat Hunt Package' || selectedIntel.category === 'Threat Hunt Packages' || selectedIntel.category === 'Threat Hunt') && (
                                <>
                                  <div><strong>Hunt Scope &amp; Findings:</strong> {resp.follow_up_action || 'N/A'}</div>
                                </>
                              )}

                              {(!selectedIntel.category || selectedIntel.category === 'Other' || selectedIntel.category.startsWith('Other - ') || selectedIntel.category === 'RFI') && (
                                <div><strong>{selectedIntel.category === 'RFI' ? 'RFI Response Details:' : 'Others:'}</strong> {resp.other_type_of_alert || 'N/A'}</div>
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: '11px' }}><strong>Findings:</strong> {resp.findings}</div>
                          {resp.affected_assets && resp.affected_assets.length > 0 && (
                            <div style={{ fontSize: '11px', marginTop: '5px' }}><strong>Affected Assets:</strong> {resp.affected_assets.join(', ')}</div>
                          )}
                          {resp.mitigation_measures && resp.mitigation_measures.length > 0 && (
                            <div style={{ fontSize: '11px', marginTop: '5px' }}><strong>Mitigation Measures:</strong> {resp.mitigation_measures.join(', ')}</div>
                          )}
                        </>
                      )}

                      {resp.evidence_files && resp.evidence_files.length > 0 && (
                        <div style={{ marginTop: '10px' }}>
                          <div style={{ fontSize: '11px', marginBottom: '5px' }}><strong>Supporting Evidence:</strong></div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                            {resp.evidence_files.map((file, idx) => (
                              <a
                                key={idx}
                                href="#"
                                onClick={(e) => handleDownload(e, `/api/v1/intel/${selectedIntel.id}/responses/${resp.id}/evidence/${encodeURIComponent(file.filename)}`, file.filename)}
                                className="attachment-pill"
                              >
                                📄 {file.filename}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Clarification Thread Section */}
                      {selectedIntel.type === 'Alert' && (
                        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed var(--border-color)' }}>
                          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div>💬 Clarification Thread ({resp.clarification_thread?.length || 0})</div>
                            {resp.clarification_is_open !== false && (
                              <button onClick={() => handleCloseResponseClarification(resp.id)} style={{ padding: '2px 8px', fontSize: '11px', background: 'var(--alert-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close Thread</button>
                            )}
                          </div>
                          
                          {resp.clarification_thread && resp.clarification_thread.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px', maxHeight: '200px', overflowY: 'auto', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                              {resp.clarification_thread.map((msg, mIdx) => (
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
                              No clarification messages yet. Ask the member to clarify any response details below.
                            </div>
                          )}

                          {/* Add Clarification Message Input */}
                          {resp.clarification_is_open !== false ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                              <input
                                type="text"
                                placeholder="Enter clarification message..."
                                className="field-input"
                                style={{ flex: 1, padding: '8px 12px', fontSize: '12px', boxSizing: 'border-box', height: '34px' }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.target.value.trim()) {
                                    e.preventDefault();
                                    handleSendClarification(selectedIntel.id, resp.id, e.target.value.trim());
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
                                    handleSendClarification(selectedIntel.id, resp.id, input.value.trim());
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
                      )}
                    </div>
                    );
                  });
                }
                return null;
              })()}

            </div>
          ))}
          </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AcsacIntelDetailDrawer;
