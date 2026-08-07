import re

with open('frontend/src/components/AcsacDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

ac_old = """                          <div style={{ fontSize: '11px' }}><strong>Findings:</strong> {resp.findings}</div>
                          {resp.affected_assets && resp.affected_assets.length > 0 && (
                            <div style={{ fontSize: '11px', marginTop: '5px' }}><strong>Affected Assets:</strong> {resp.affected_assets.join(', ')}</div>
                          )}
                          {resp.mitigation_measures && resp.mitigation_measures.length > 0 && (
                            <div style={{ fontSize: '11px', marginTop: '5px' }}><strong>Mitigation Measures:</strong> {resp.mitigation_measures.join(', ')}</div>
                          )}"""

ac_new = """                          {selectedIntel.type === 'Alert' ? (
                            <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div><strong>CII Sector:</strong> {resp.cii_sector}</div>
                              <div><strong>Sector Lead:</strong> {resp.sector_lead_name}</div>
                              <div><strong>Affected CIIOs:</strong> {resp.affected_member_status}</div>
                              <div><strong>Environment:</strong> {resp.affected_environment}</div>
                              <div><strong>Delay Reason:</strong> {resp.delay_reason || 'N/A'}</div>
                              <div><strong>Expected Date:</strong> {resp.expected_verification_date || 'N/A'}</div>
                              <div><strong>Patch Status:</strong> {resp.patch_status}</div>
                              <div><strong>Mitigation Measure:</strong> {resp.mitigation_measure_if_not_patched || 'N/A'}</div>
                              <div><strong>IOC Direction:</strong> {resp.ioc_traffic_direction}</div>
                              <div><strong>Follow-up Action:</strong> {resp.follow_up_action || 'N/A'}</div>
                              <div><strong>Others:</strong> {resp.other_type_of_alert || 'N/A'}</div>
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
                          )}"""

content = content.replace(ac_old, ac_new)

with open('frontend/src/components/AcsacDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
