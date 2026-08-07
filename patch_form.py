import re

with open('frontend/src/components/MemberDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

form_old = """            {(selectedIntel.my_status.status !== 'UNACKNOWLEDGED' && selectedIntel.my_status.status !== 'RESPONDED' && selectedIntel.my_status.status !== 'UPDATED') ? (
              <form onSubmit={handleSubmitResponse} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="form-section-label">
                  Submit Investigation
                </div>
                
                <div className="field-group">
                  <label className="field-label">Findings <span className="field-required">*</span></label>
                  <textarea 
                    className="field-textarea" 
                    value={findings} 
                    onChange={e => setFindings(e.target.value)} 
                    required 
                    placeholder="Results of your internal investigation..."
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Affected Assets (comma separated)</label>
                  <input 
                    className="field-input" 
                    value={assets} 
                    onChange={e => setAssets(e.target.value)} 
                    placeholder="e.g. server-01, DB-master"
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Mitigation Measures (one per line)</label>
                  <textarea 
                    className="field-textarea" 
                    value={mitigations} 
                    onChange={e => setMitigations(e.target.value)} 
                    placeholder="e.g. Patched to 14.2"
                  />
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

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="submit" className="submit-btn" style={{ flex: 1 }}>
                    Submit Response
                  </button>
                </div>
              </form>
            ) : null}"""


form_new = """            {(selectedIntel.my_status.status !== 'UNACKNOWLEDGED' && selectedIntel.my_status.status !== 'RESPONDED' && selectedIntel.my_status.status !== 'UPDATED') ? (
              <form onSubmit={handleSubmitResponse} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedIntel.type === 'Alert' ? (
                  <>
                    <div className="form-section-label" style={{ marginTop: '10px' }}>Section A: General Information</div>
                    <div className="field-group">
                      <label className="field-label">CII Sector</label>
                      <select className="field-input" value={ciiSector} onChange={e => setCiiSector(e.target.value)}>
                        {['Aviation', 'Banking and Finance', 'Energy', 'Government', 'Healthcare', 'Infocomm', 'Land Transport', 'Maritime', 'Media', 'Security and Emergency Services', 'Water'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="field-group">
                      <label className="field-label">Sector Lead Name</label>
                      <input className="field-input" value={sectorLeadName} onChange={e => setSectorLeadName(e.target.value)} />
                    </div>

                    <div className="form-section-label" style={{ marginTop: '10px' }}>Section B: Checking of Affected Products</div>
                    <div className="field-group">
                      <label className="field-label">Are there any CIIOs in your sector that are affected?</label>
                      <select className="field-input" value={affectedMemberStatus} onChange={e => setAffectedMemberStatus(e.target.value)}>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="Pending Response">Pending Response</option>
                      </select>
                    </div>
                    <div className="field-group">
                      <label className="field-label">Affected Environment</label>
                      <select className="field-input" value={affectedEnvironment} onChange={e => setAffectedEnvironment(e.target.value)}>
                        <option value="CII">CII</option>
                        <option value="Non-CII">Non-CII</option>
                      </select>
                    </div>
                    <div className="field-group">
                      <label className="field-label">Reason for not meeting deadline or yet to response</label>
                      <textarea className="field-textarea" value={delayReason} onChange={e => setDelayReason(e.target.value)} />
                    </div>
                    <div className="field-group">
                      <label className="field-label">Expected product verification date / response date</label>
                      <input type="date" className="field-input" value={expectedVerificationDate} onChange={e => setExpectedVerificationDate(e.target.value)} />
                    </div>

                    <div className="form-section-label" style={{ marginTop: '10px' }}>Section C: Patching of Affected Products</div>
                    <div className="field-group">
                      <label className="field-label">Patch Status</label>
                      <select className="field-input" value={patchStatus} onChange={e => setPatchStatus(e.target.value)}>
                        {['Completed', 'In Progress', 'Replacing Affected Product Through Tech Refresh', 'Pending'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="field-group">
                      <label className="field-label">If patching not completed, provide mitigation measure</label>
                      <textarea className="field-textarea" value={mitigationMeasureIfNotPatched} onChange={e => setMitigationMeasureIfNotPatched(e.target.value)} />
                    </div>

                    <div className="form-section-label" style={{ marginTop: '10px' }}>Section D: IOC Scan Results</div>
                    <div className="field-group">
                      <label className="field-label">Is the IOC traffic inbound, outbound or both?</label>
                      <select className="field-input" value={iocTrafficDirection} onChange={e => setIocTrafficDirection(e.target.value)}>
                        <option value="Inbound">Inbound</option>
                        <option value="Outbound">Outbound</option>
                        <option value="Both">Both</option>
                      </select>
                    </div>
                    <div className="field-group">
                      <label className="field-label">Follow up action(s) taken and results of impact assessment?</label>
                      <textarea className="field-textarea" value={followUpAction} onChange={e => setFollowUpAction(e.target.value)} />
                    </div>

                    <div className="form-section-label" style={{ marginTop: '10px' }}>Section E: Others</div>
                    <div className="field-group">
                      <label className="field-label">Alerts which require action but not covered by other sections</label>
                      <textarea className="field-textarea" value={otherTypeOfAlert} onChange={e => setOtherTypeOfAlert(e.target.value)} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-section-label">
                      Submit Investigation
                    </div>
                    
                    <div className="field-group">
                      <label className="field-label">Findings <span className="field-required">*</span></label>
                      <textarea 
                        className="field-textarea" 
                        value={findings} 
                        onChange={e => setFindings(e.target.value)} 
                        required 
                        placeholder="Results of your internal investigation..."
                      />
                    </div>

                    <div className="field-group">
                      <label className="field-label">Affected Assets (comma separated)</label>
                      <input 
                        className="field-input" 
                        value={assets} 
                        onChange={e => setAssets(e.target.value)} 
                        placeholder="e.g. server-01, DB-master"
                      />
                    </div>

                    <div className="field-group">
                      <label className="field-label">Mitigation Measures (one per line)</label>
                      <textarea 
                        className="field-textarea" 
                        value={mitigations} 
                        onChange={e => setMitigations(e.target.value)} 
                        placeholder="e.g. Patched to 14.2"
                      />
                    </div>
                  </>
                )}

                <div className="form-section-label" style={{ marginTop: '10px' }}>{selectedIntel.type === 'Alert' ? 'Section F: Attachment' : ''}</div>
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

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="submit" className="submit-btn" style={{ flex: 1 }}>
                    Submit Response
                  </button>
                </div>
              </form>
            ) : null}"""

content = content.replace(form_old, form_new)

with open('frontend/src/components/MemberDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
