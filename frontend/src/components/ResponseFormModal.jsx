import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';

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

function ResponseFormModal({ selectedIntel, editingResponse, onClose, onSuccess }) {
  const { authFetch } = useAuth();
  
  const [findings, setFindings] = useState('');
  const [assets, setAssets] = useState('');
  const [mitigations, setMitigations] = useState('');
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

  useEffect(() => {
    if (editingResponse) {
      const resp = editingResponse;
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
    } else {
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
    }
  }, [editingResponse, selectedIntel, todayStr]);

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
      const url = editingResponse
        ? `/api/v1/intel/${selectedIntel.id}/responses/${editingResponse.id}`
        : `/api/v1/intel/${selectedIntel.id}/respond`;
      const method = editingResponse ? 'PUT' : 'POST';

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
      
      onSuccess();
    } catch (err) {
      console.error(err);
    }
  };

  if (!selectedIntel) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content large" style={{ maxWidth: '750px', height: 'auto', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: '#080e1e', border: '1px solid var(--border-normal)' }}>
        <div className="modal-header" style={{ background: 'rgba(5, 9, 20, 0.8)', borderBottom: '1px solid var(--border-subtle)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '16px', margin: 0, color: 'var(--text-primary)' }}>
              {editingResponse ? 'Edit / Update Response' : 'Investigation & Response Form'}
            </h2>
          </div>
          <button className="close-btn" style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '18px', cursor: 'pointer' }} onClick={onClose}>✖</button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
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
              <button type="button" className="submit-btn" style={{ flex: 1, background: 'var(--bg-glass)', border: '1px solid var(--text-dim)' }} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="submit-btn" style={{ flex: 1 }}>
                {editingResponse ? 'Update Response' : 'Submit Response'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ResponseFormModal;
