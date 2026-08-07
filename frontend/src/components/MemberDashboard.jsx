import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import IntelFeed from './IntelFeed';
import './IncidentReportingModal.css';

const isIOC = (category) => category === 'Indicator of Compromise' || category === 'Indicators of Compromise' || category === 'IOC' || category === 'IOCs';
const isThreatHunt = (category) => category === 'Threat Hunt Package' || category === 'Threat Hunt Packages' || category === 'Threat Hunt';
const isOtherCategory = (category) => !category || category === 'Other' || category.startsWith('Other - ');

const getAffectedQuestionLabel = (category) => {
  if (category === 'Exploited Vulnerabilities') return 'Affected by Exploited Vulnerability ?';
  if (isIOC(category)) return 'IOC Hit';
  if (category === 'Campaign') return 'Affected by Campaign ?';
  if (isThreatHunt(category)) return 'MALICIOUS/SUSPICIOUS/ABNORMAL ACTIVITIES DETECTED THROUGH THE USE OF THREAT HUNT PACKAGE ?';
  if (category === 'RFI') return 'Applicable / Affected by RFI ?';
  return `Affected by ${category || 'Alert / Advisory'} ?`;
};

function MemberDashboard() {
  const { authFetch } = useAuth();
  const [intels, setIntels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedIntel, setSelectedIntel] = useState(null);

  // Form states
  const [findings, setFindings] = useState('');
  const [assets, setAssets] = useState('');
  const [mitigations, setMitigations] = useState('');
  
  // Alert form states
  const [ciiSector, setCiiSector] = useState('N/A');
  const [sectorLeadName, setSectorLeadName] = useState('N/A');
  const [affectedMemberStatus, setAffectedMemberStatus] = useState('No');
  const [affectedEnvironment, setAffectedEnvironment] = useState('Non-CII');
  const [affectedAssetNetwork, setAffectedAssetNetwork] = useState('');
  const [delayReason, setDelayReason] = useState('Pending patch testing');
  const getTodayStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayStr = getTodayStr();
  const [expectedVerificationDate, setExpectedVerificationDate] = useState(todayStr);
  const [patchStatus, setPatchStatus] = useState('Completed');
  const [mitigationMeasureIfNotPatched, setMitigationMeasureIfNotPatched] = useState('Protection Controls');
  const [iocTrafficDirection, setIocTrafficDirection] = useState('Inbound');
  const [followUpAction, setFollowUpAction] = useState('IOC implemented at network firewall, no impact');
  const [otherTypeOfAlert, setOtherTypeOfAlert] = useState('NIL');
  const [iocDetected, setIocDetected] = useState('E.g. xxx.xxx.xxx.xxx');

  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [editingResponseId, setEditingResponseId] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);

  const fetchIntels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/v1/intel/member');
      if (res.ok) {
        const data = await res.json();
        if (filter !== 'all') {
          setIntels(data.filter(i => i.type === filter));
        } else {
          setIntels(data);
        }
        
        setSelectedIntel(prev => {
          if (prev) {
            return data.find(i => i.id === prev.id) || prev;
          }
          return prev;
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [authFetch, filter]);

  useEffect(() => {
    fetchIntels();
  }, [fetchIntels]);

  useEffect(() => {
    if (selectedIntel) {
      const updatedIntel = intels.find(i => i.id === selectedIntel.id);
      if (updatedIntel) {
        setSelectedIntel(updatedIntel);
      }
    }
  }, [intels]);

  const handleAcknowledge = async () => {
    if (!selectedIntel) return;
    try {
      await authFetch(`/api/v1/intel/${selectedIntel.id}/acknowledge`, { method: 'POST' });
      fetchIntels();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEdit = (resp) => {
    setEditingResponseId(resp.id);
    setAffectedMemberStatus(resp.affected_member_status || 'No');
    setAffectedEnvironment(resp.affected_environment || 'Non-CII');
    setAffectedAssetNetwork(resp.affected_assets && resp.affected_assets.length > 0 ? resp.affected_assets.join(', ') : '');
    setDelayReason(resp.delay_reason || '');
    setExpectedVerificationDate(resp.expected_verification_date ? resp.expected_verification_date.split('T')[0] : todayStr);
    setPatchStatus(resp.patch_status || 'Completed');
    setMitigationMeasureIfNotPatched(resp.mitigation_measure_if_not_patched || 'Protection Controls');
    setIocTrafficDirection(resp.ioc_traffic_direction || (selectedIntel?.category === 'Campaign' ? 'E.g. xxx.xxx.xxx.xxx' : 'Inbound'));
    setFollowUpAction(
      resp.follow_up_action ||
        (selectedIntel?.category === 'Campaign'
          ? 'IOC block implemented at network firewall'
          : isIOC(selectedIntel?.category)
          ? 'IOC implemented at network firewall, no impact'
          : '')
    );
    setOtherTypeOfAlert(resp.other_type_of_alert || '');
    setIocDetected(resp.findings || 'E.g. xxx.xxx.xxx.xxx');
    setFindings(resp.findings || '');
    setAssets(resp.affected_assets ? resp.affected_assets.join(', ') : '');
    setMitigations(resp.mitigation_measures ? resp.mitigation_measures.join('\n') : '');
    setShowResponseModal(true);
  };

  const openNewResponseModal = () => {
    setEditingResponseId(null);
    setAffectedMemberStatus(selectedIntel?.category === 'RFI' ? 'Yes' : 'No');
    setAffectedEnvironment('Non-CII');
    setAffectedAssetNetwork('');
    setDelayReason(
      selectedIntel?.category === 'RFI'
        ? ''
        : (isIOC(selectedIntel?.category) || isThreatHunt(selectedIntel?.category))
        ? 'N.A.'
        : 'Pending patch testing'
    );
    setExpectedVerificationDate(todayStr);
    if (isIOC(selectedIntel?.category)) {
      setIocDetected('E.g. xxx.xxx.xxx.xxx');
      setIocTrafficDirection('Inbound');
      setFollowUpAction('IOC implemented at network firewall, no impact');
    } else if (selectedIntel?.category === 'Campaign') {
      setIocTrafficDirection('E.g. xxx.xxx.xxx.xxx');
      setFollowUpAction('IOC block implemented at network firewall');
    } else if (isThreatHunt(selectedIntel?.category)) {
      setIocTrafficDirection('Completed - No anomalies found');
      setFollowUpAction('Executed threat hunt queries; suspicious artifacts identified.');
    } else if (selectedIntel?.category === 'RFI') {
      setOtherTypeOfAlert('Information provided as requested.');
    } else {
      setIocTrafficDirection('Inbound');
      setFollowUpAction('IOC Blocked');
    }
    setPatchStatus('Completed');
    setMitigationMeasureIfNotPatched('Protection Controls');
    setOtherTypeOfAlert((selectedIntel?.category === 'RFI' || isOtherCategory(selectedIntel?.category)) ? '' : 'NIL');
    setEvidenceFiles([]);
    setShowResponseModal(true);
  };

  const handleCancelEdit = () => {
    setEditingResponseId(null);
    setShowResponseModal(false);
    setFindings('');
    setAssets('');
    setMitigations('');
    setCiiSector('N/A');
    setSectorLeadName('N/A');
    setAffectedMemberStatus('No');
    setAffectedEnvironment('Non-CII');
    setAffectedAssetNetwork('');
    setDelayReason('Pending patch testing');
    setExpectedVerificationDate(todayStr);
    setPatchStatus('Completed');
    setMitigationMeasureIfNotPatched('Protection Controls');
    setIocTrafficDirection('Inbound');
    setFollowUpAction('IOC Blocked');
    setOtherTypeOfAlert('NIL');
    setEvidenceFiles([]);
  };

  const handleSubmitResponse = async (e) => {
    e.preventDefault();
    if (!selectedIntel) return;
    
    let payload = {};
    if (selectedIntel.type === 'Alert' || selectedIntel.category) {
      payload = {
        cii_sector: 'N/A',
        sector_lead_name: 'N/A',
        findings: affectedMemberStatus === 'No' ? 'N/A' : (isIOC(selectedIntel?.category) ? iocDetected : 'N/A'),
        affected_member_status: selectedIntel?.category === 'RFI' ? 'Yes' : affectedMemberStatus,
        affected_environment: affectedMemberStatus === 'No' ? 'N/A' : (selectedIntel?.category === 'RFI' ? 'N/A' : affectedEnvironment),
        affected_assets: affectedMemberStatus === 'No' ? [] : (selectedIntel?.category === 'RFI' ? [] : (affectedAssetNetwork ? [affectedAssetNetwork.trim()].filter(Boolean) : [])),
        delay_reason: affectedMemberStatus === 'No' ? 'N/A' : (selectedIntel?.category === 'RFI' ? 'N/A' : delayReason),
        expected_verification_date: affectedMemberStatus === 'No' ? null : (selectedIntel?.category === 'RFI' ? null : (expectedVerificationDate || null)),
        patch_status: affectedMemberStatus === 'No' ? 'N/A' : (selectedIntel?.category === 'Exploited Vulnerabilities' ? patchStatus : 'N/A'),
        mitigation_measure_if_not_patched: affectedMemberStatus === 'No' ? 'N/A' : (selectedIntel?.category === 'Exploited Vulnerabilities' ? mitigationMeasureIfNotPatched : 'N/A'),
        ioc_traffic_direction: affectedMemberStatus === 'No' ? 'N/A' : ((isIOC(selectedIntel?.category) || selectedIntel?.category === 'Campaign' || selectedIntel?.category === 'Threat Hunt Package') ? iocTrafficDirection : 'N/A'),
        follow_up_action: affectedMemberStatus === 'No' ? 'N/A' : ((isIOC(selectedIntel?.category) || selectedIntel?.category === 'Campaign' || selectedIntel?.category === 'Threat Hunt Package') ? followUpAction : 'N/A'),
        other_type_of_alert: affectedMemberStatus === 'No' ? 'N/A' : ((isOtherCategory(selectedIntel?.category) || selectedIntel?.category === 'RFI') ? otherTypeOfAlert : 'N/A')
      };
    } else {
      payload = {
        findings,
        affected_assets: assets.split(',').map(s => s.trim()).filter(Boolean),
        mitigation_measures: mitigations.split('\n').map(s => s.trim()).filter(Boolean),
      };
    }

    try {
      const url = editingResponseId
        ? `/api/v1/intel/${selectedIntel.id}/responses/${editingResponseId}`
        : `/api/v1/intel/${selectedIntel.id}/respond`;
      const method = editingResponseId ? 'PUT' : 'POST';

      const res = await authFetch(url, { 
        method,
        body: JSON.stringify(payload)
      });
      
      const resData = await res.json();
      const targetResponseId = resData.response_id;
      
      if (targetResponseId && evidenceFiles.length > 0) {
        const formData = new FormData();
        evidenceFiles.forEach(file => {
          formData.append('files', file);
        });
        await authFetch(`/api/v1/intel/${selectedIntel.id}/responses/${targetResponseId}/evidence`, {
          method: 'POST',
          body: formData,
          omitContentType: true
        });
      }
      
      handleCancelEdit();
      fetchIntels();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendClarification = async (intelId, responseId, messageText) => {
    if (!messageText || !messageText.trim()) return;
    try {
      const url = `/api/v1/intel/${intelId}/responses/${responseId}/clarification`;
      await authFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText.trim() })
      });
      fetchIntels();
    } catch(err) {
      console.error(err);
    }
  };

  const handleSendStatusClarification = async (intelId, statusId, messageText) => {
    if (!messageText || !messageText.trim()) return;
    try {
      const url = `/api/v1/intel/${intelId}/status/${statusId}/clarification`;
      await authFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText.trim() })
      });
      fetchIntels();
    } catch(err) {
      console.error(err);
    }
  };

  const handleDownload = async (e, url, filename) => {
    e.preventDefault();
    try {
      const res = await authFetch(url);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error(err);
      alert('Failed to download file.');
    }
  };

  return (
    <div className="main-content">
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 25px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-glass)', gap: '10px' }}>
          <div style={{ fontWeight: '600', fontSize: '18px' }}>Member Dashboard</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="submit-btn" onClick={(e) => handleDownload(e, '/api/v1/intel/export/csv', 'my_intel_report.csv')} style={{ padding: '8px 16px', fontSize: '14px', backgroundColor: 'transparent', border: '1px solid var(--border-color)' }}>
              Export CSV
            </button>
          </div>
        </div>

        <IntelFeed 
          intels={intels} 
          loading={loading} 
          filter={filter} 
          onFilterChange={setFilter} 
          onIntelSelect={(item) => {
            setSelectedIntel(item);
            setEditingResponseId(null);
          }}
        />
      </div>

            {/* Slide-Out Side Drawer */}
      {selectedIntel && (
        <div className="side-drawer-overlay" onClick={() => setSelectedIntel(null)}>
          <div className="side-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="side-drawer-header">
              <div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{selectedIntel.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>{selectedIntel.case_id} • {selectedIntel.type}</div>
              </div>
              <button onClick={() => setSelectedIntel(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
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
        {selectedIntel && (
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
        )}

        
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
      )}

      {/* Pop-up Modal for Investigation & Response Form */}
      {showResponseModal && selectedIntel && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content large" style={{ maxWidth: '750px', height: 'auto', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: '#080e1e', border: '1px solid var(--border-normal)' }}>
            <div className="modal-header" style={{ background: 'rgba(5, 9, 20, 0.8)', borderBottom: '1px solid var(--border-subtle)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '16px', margin: 0, color: 'var(--text-primary)' }}>
                  {editingResponseId ? 'Edit / Update Response' : 'Investigation & Response Form'}
                </h2>
              </div>
              <button className="close-btn" style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '18px', cursor: 'pointer' }} onClick={handleCancelEdit}>✖</button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {/* Alert / Advisory Details & Threat Data Card */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '16px',
                marginBottom: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {selectedIntel.type} Information
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-color)', marginTop: '3px' }}>
                    {selectedIntel.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                    <span><strong>Category:</strong> <strong style={{ color: 'var(--accent)' }}>{selectedIntel.category || 'General Threat Intelligence'}</strong></span>
                    {selectedIntel.classification && <span><strong>Classification:</strong> {selectedIntel.classification}</span>}
                  </div>
                </div>

                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                  <strong style={{ color: 'var(--text-color)', fontSize: '12px', textTransform: 'uppercase' }}>Description:</strong>
                  <div style={{ marginTop: '5px', background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '4px', borderLeft: '3px solid var(--accent)' }}>
                    {selectedIntel.description || selectedIntel.summary || 'No description provided.'}
                  </div>
                </div>

                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                  <strong style={{ color: 'var(--text-color)', fontSize: '12px', textTransform: 'uppercase' }}>Threat Data / IOCs:</strong>
                  <div style={{ marginTop: '5px', background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '4px', borderLeft: '3px solid #38bdf8', fontFamily: 'monospace', fontSize: '12px', color: '#38bdf8' }}>
                    {selectedIntel.threat_data || 'NIL — No explicit IOC or threat data strings recorded.'}
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmitResponse} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {selectedIntel.category !== 'RFI' && (
                  <div className="field-group" style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px 16px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <label className="field-label" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-color)' }}>
                      {getAffectedQuestionLabel(selectedIntel.category)}
                    </label>
                    <select
                      className="field-select"
                      value={affectedMemberStatus}
                      onChange={e => setAffectedMemberStatus(e.target.value)}
                      style={{ marginTop: '6px' }}
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                )}

                {(affectedMemberStatus === 'Yes' || selectedIntel.category === 'RFI') && (
                  <>
                    {/* SECTION 1: Affected Systems & Environment (Not applicable for RFI) */}
                    {selectedIntel.category !== 'RFI' && (
                      <>
                        <div className="form-section-label">
                          {selectedIntel.category === 'Exploited Vulnerabilities'
                            ? 'Section 1: Checking of Affected Products / Systems & Patch Status'
                            : isIOC(selectedIntel.category)
                            ? 'Section 1: Checking of Affected Products / Systems & Impact Assessment'
                            : 'Section 1: Checking of Affected Products / Systems'}
                        </div>

                        <div className="field-group">
                          <label className="field-label">Affected Environment</label>
                          <select className="field-select" value={affectedEnvironment} onChange={e => setAffectedEnvironment(e.target.value)}>
                            <option value="Non-CII">Non-CII</option>
                            <option value="CII">CII</option>
                          </select>
                        </div>

                        <div className="field-group">
                          <label className="field-label">Affected Asset / Network</label>
                          <input
                            type="text"
                            className="field-input"
                            placeholder="e.g. Core Banking Router, Internal Subnet 10.0.4.0/24"
                            value={affectedAssetNetwork}
                            onChange={e => setAffectedAssetNetwork(e.target.value)}
                          />
                        </div>

                        {selectedIntel.category === 'Exploited Vulnerabilities' && (
                          <div className="field-group">
                            <label className="field-label">Patch Status</label>
                            <select className="field-select" value={patchStatus} onChange={e => setPatchStatus(e.target.value)}>
                              <option value="Completed">Completed</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Replacing Affected Product Through Tech Refresh">Replacing Affected Product Through Tech Refresh</option>
                              <option value="Pending Verification">Pending Verification</option>
                            </select>
                          </div>
                        )}


                        {isThreatHunt(selectedIntel.category) && (
                          <div className="field-group">
                            <label className="field-label">Hunt Scope & Findings Details</label>
                            <textarea
                              className="field-textarea"
                              placeholder="e.g. Executed hunt queries across 120 endpoints; identified 2 flagged logs currently being analyzed."
                              value={followUpAction}
                              onChange={e => setFollowUpAction(e.target.value)}
                            />
                          </div>
                        )}
                      </>
                    )}

                    {/* SECTION 2: Category-Specific Investigation & Response Details */}
                    {selectedIntel.category === 'Exploited Vulnerabilities' && patchStatus !== 'Completed' && (
                      <>
                        <div className="form-section-label" style={{ marginTop: '10px' }}>
                          Section 2: Mitigation Measure While Patch Is Being Applied
                        </div>
                        <div className="field-group">
                          <label className="field-label">If patching not completed, provide mitigation measure</label>
                          <textarea className="field-textarea" value={mitigationMeasureIfNotPatched} onChange={e => setMitigationMeasureIfNotPatched(e.target.value)} />
                        </div>
                      </>
                    )}

                    {isIOC(selectedIntel.category) && (
                      <>
                        <div className="form-section-label" style={{ marginTop: '10px' }}>
                          Section 2 : Findings
                        </div>
                        <div className="field-group">
                          <label className="field-label">IOC detected</label>
                          <textarea
                            className="field-textarea"
                            placeholder="E.g. xxx.xxx.xxx.xxx"
                            value={iocDetected}
                            onChange={e => setIocDetected(e.target.value)}
                          />
                        </div>
                        <div className="field-group">
                          <label className="field-label">Is the IOC Traffic Inbound, Outbound or both ?</label>
                          <select className="field-select" value={iocTrafficDirection} onChange={e => setIocTrafficDirection(e.target.value)}>
                            <option value="Inbound">Inbound</option>
                            <option value="Outbound">Outbound</option>
                            <option value="Both">Both</option>
                          </select>
                        </div>
                        <div className="field-group">
                          <label className="field-label">
                            What is / are the follow-up action(s) taken and the results of your impact assessment ? Was there any compromise to your network or organisation ?
                          </label>
                          <textarea
                            className="field-textarea"
                            placeholder="IOC implemented at network firewall, no impact"
                            value={followUpAction}
                            onChange={e => setFollowUpAction(e.target.value)}
                          />
                        </div>
                      </>
                    )}

                    {selectedIntel.category === 'Campaign' && (
                      <>
                        <div className="form-section-label" style={{ marginTop: '10px' }}>
                          Section 2: Campaign Impact & Defense Posture (Campaign)
                        </div>
                        <div className="field-group">
                          <label className="field-label">Have any adversary TTPs or campaign indicators been observed</label>
                          <textarea
                            className="field-textarea"
                            placeholder="E.g. xxx.xxx.xxx.xxx"
                            value={iocTrafficDirection}
                            onChange={e => setIocTrafficDirection(e.target.value)}
                          />
                        </div>
                        <div className="field-group">
                          <label className="field-label">Summary of Defensive Actions</label>
                          <textarea
                            className="field-textarea"
                            placeholder="IOC block implemented at network firewall"
                            value={followUpAction}
                            onChange={e => setFollowUpAction(e.target.value)}
                          />
                        </div>
                      </>
                    )}

                    {selectedIntel.category === 'RFI' && (
                      <>
                        <div className="form-section-label">
                          Section 1: Request for Information (RFI) Response
                        </div>
                        <div className="field-group">
                          <label className="field-label">
                            Provide requested information / response details for this RFI
                          </label>
                          <textarea className="field-textarea" value={otherTypeOfAlert} onChange={e => setOtherTypeOfAlert(e.target.value)} />
                        </div>
                      </>
                    )}

                    {isOtherCategory(selectedIntel.category) && (
                      <>
                        <div className="form-section-label" style={{ marginTop: '10px' }}>
                          Section 2: Provide requested information / response details for this RFI
                        </div>
                        <div className="field-group">
                          <textarea className="field-textarea" value={otherTypeOfAlert} onChange={e => setOtherTypeOfAlert(e.target.value)} />
                        </div>
                      </>
                    )}

                    {/* Section 3: Timeline & Verification Status */}
                    {selectedIntel.category !== 'RFI' && !isOtherCategory(selectedIntel.category) && selectedIntel.category !== 'Campaign' && !isThreatHunt(selectedIntel.category) && (selectedIntel.category !== 'Exploited Vulnerabilities' || patchStatus !== 'Completed') && (
                      <>
                        <div className="form-section-label" style={{ marginTop: '10px' }}>
                          Section 3: Timeline & Verification Status
                        </div>
                        <div className="field-group">
                          <label className="field-label">Reason for not meeting deadline or yet to respond</label>
                          <textarea className="field-textarea" value={delayReason} onChange={e => setDelayReason(e.target.value)} />
                        </div>

                        {!isIOC(selectedIntel.category) && (
                          <div className="field-group">
                            <label className="field-label">Expected Patch or Mitigation Date</label>
                            <input
                              type="date"
                              className="field-input"
                              style={{ colorScheme: 'dark', cursor: 'pointer' }}
                              value={expectedVerificationDate || todayStr}
                              onChange={e => setExpectedVerificationDate(e.target.value)}
                              onClick={e => { try { e.target.showPicker && e.target.showPicker(); } catch (err) {} }}
                            />
                          </div>
                        )}
                      </>
                    )}

                    {/* Supporting Evidence / Attachment */}
                    <div className="form-section-label" style={{ marginTop: '10px' }}>
                      {(selectedIntel.category === 'RFI' || isThreatHunt(selectedIntel.category)) ? 'Section 2: Supporting Evidence / Attachment' : (selectedIntel.category === 'Campaign' || isOtherCategory(selectedIntel.category)) ? 'Section 3: Supporting Evidence / Attachment' : 'Section 4: Supporting Evidence / Attachment'}
                    </div>
                    <div className="field-group">
                      <label className="field-label">Supporting Evidence (multiple files allowed)</label>
                      <input
                        type="file"
                        multiple
                        className="field-input"
                        style={{ padding: '5px' }}
                        onChange={e => setEvidenceFiles(Array.from(e.target.files))}
                      />
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '15px' }}>
                  <button type="button" className="submit-btn" style={{ flex: 1, background: 'var(--bg-glass)', border: '1px solid var(--text-dim)' }} onClick={handleCancelEdit}>
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn" style={{ flex: 1 }}>
                    {editingResponseId ? 'Update Response' : 'Submit Response'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MemberDashboard;
