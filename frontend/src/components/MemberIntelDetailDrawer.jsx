import React from 'react';

const isIOC = (category) => category === 'Indicator of Compromise' || category === 'Indicators of Compromise' || category === 'IOC' || category === 'IOCs';
const isThreatHunt = (category) => category === 'Threat Hunt Package' || category === 'Threat Hunt Packages' || category === 'Threat Hunt';
const isOtherCategory = (category) => !category || category === 'Other' || category.startsWith('Other - ');

function MemberIntelDetailDrawer({
  selectedIntel,
  onClose,
  handleDownload,
  handleAcknowledge,
  openNewResponseModal,
  handleStartEdit,
  handleSendClarification
}) {
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
                  <a key={idx} href="#" onClick={(e) => handleDownload(e, `/api/v1/intel/${selectedIntel.id}/attachment/${encodeURIComponent(att.filename)}`, att.filename)} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--accent)', textDecoration: 'none', fontSize: '13px', padding: '5px 10px', border: '1px solid var(--accent)', borderRadius: '4px' }}>
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

          {/* Selected Alert / Advisory Action Banner */}
          <div style={{
            margin: '15px 25px 0 25px',
            padding: '16px 20px',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-normal)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '15px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-color)' }}>
                Status:{' '}
                <span style={{
                  color: ((selectedIntel.my_status && selectedIntel.my_status.status !== 'UNACKNOWLEDGED') || selectedIntel.my_status?.status === 'RESOLVED' || selectedIntel.my_status?.status === 'PENDING_REVIEW') ? 'var(--success-color)' : 'var(--alert-color)',
                  fontWeight: '600'
                }}>
                  {selectedIntel.type === 'Advisory'
                    ? ((selectedIntel.my_status && selectedIntel.my_status.status !== 'UNACKNOWLEDGED') ? 'Acknowledged' : 'Pending Action')
                    : (selectedIntel.my_status?.status
                        ? (selectedIntel.my_status.status === 'PENDING_REVIEW' ? 'For Analyst Review' : (selectedIntel.my_status.status === 'UNACKNOWLEDGED' ? 'UNRESPONDED' : selectedIntel.my_status.status))
                        : 'Pending Action'
                      )
                  }
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {selectedIntel.type === 'Advisory' && (!selectedIntel.my_status || selectedIntel.my_status.status === 'UNACKNOWLEDGED') && (
                <button
                  onClick={handleAcknowledge}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    borderRadius: '4px',
                    border: '1px solid var(--accent)',
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  ✓ Acknowledge Receipt
                </button>
              )}
              {selectedIntel.type === 'Advisory' && selectedIntel.my_status && selectedIntel.my_status.status !== 'UNACKNOWLEDGED' && (
                <span style={{
                  padding: '8px 14px',
                  fontSize: '12px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(34, 197, 94, 0.15)',
                  color: 'var(--success-color)',
                  border: '1px solid rgba(34, 197, 94, 0.35)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontWeight: '600'
                }}>
                  ✓ Acknowledged
                </span>
              )}

              {selectedIntel.type === 'Alert' && (!selectedIntel.my_responses || selectedIntel.my_responses.length === 0) && (
                <button
                  onClick={openNewResponseModal}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: 'var(--accent)',
                    color: '#000',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  + Submit Investigation & Response
                </button>
              )}
            </div>
          </div>

          <div style={{ marginTop: '30px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: 'var(--accent)' }}>Submitted Investigation & Responses</h4>
            {selectedIntel.my_responses && selectedIntel.my_responses.length > 0 ? (
            selectedIntel.my_responses.map(resp => (
              <div key={resp.id} style={{ padding: '14px', background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: '6px', marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ fontSize: '12px' }}>
                    <div style={{ marginBottom: '6px' }}>
                      <strong>SLA Compliance: </strong> 
                      {resp.sla_met === true && <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>Yes</span>}
                      {resp.sla_met === false && <span style={{ color: 'var(--alert-color)', fontWeight: 'bold' }}>No</span>}
                      {resp.sla_met === null && <span style={{ color: 'var(--text-dim)' }}>N/A</span>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                          {isIOC(selectedIntel.category) && (
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
                          {isThreatHunt(selectedIntel.category) && (
                            <>
                              <div><strong>Hunt Scope & Findings:</strong> {resp.follow_up_action || 'N/A'}</div>
                            </>
                          )}
                          {(isOtherCategory(selectedIntel.category) || selectedIntel.category === 'RFI') && (
                            <div><strong>{selectedIntel.category === 'RFI' ? 'RFI Response Details:' : 'Others:'}</strong> {resp.other_type_of_alert || 'N/A'}</div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="submit-btn"
                    style={{ padding: '4px 14px', width: 'auto', fontSize: '11px', background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)' }}
                    onClick={() => handleStartEdit(resp)}
                  >
                    Edit Response
                  </button>
                </div>
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
                    <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      💬 Clarification Thread ({resp.clarification_thread?.length || 0})
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
                        No clarification messages yet. You can reply or ask questions to the ACSAC analyst below.
                      </div>
                    )}
                    {resp.clarification_is_open !== false ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                        <input
                          type="text"
                          placeholder="Enter clarification message..."
                          className="field-input"
                          style={{ flex: 1, padding: '8px 12px', fontSize: '12px', boxSizing: 'border-box', height: '34px' }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.target.value.trim()) {
                              handleSendClarification(selectedIntel.id, resp.id, e.target.value.trim());
                              e.target.value = '';
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="submit-btn"
                          style={{ padding: '0 14px', height: '34px', fontSize: '12px', width: 'auto' }}
                          onClick={(e) => {
                            const input = e.target.previousSibling;
                            if (input.value.trim()) {
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
                        🔒 This clarification thread has been closed by the ACSAC analyst.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : selectedIntel.type === 'Advisory' ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontStyle: 'italic', lineHeight: '1.5' }}>
              📋 This is an Advisory.<br />
              Acknowledgement of receipt is required, but no investigation response is necessary.
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontStyle: 'italic' }}>
              No responses submitted yet for this alert.
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
  );
}

export default MemberIntelDetailDrawer;
