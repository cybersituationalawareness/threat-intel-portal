import React from 'react';

function IsacSubmissionForm({
  showForm,
  setShowForm,
  isEditing,
  formData,
  setFormData,
  handleSubmit,
  submitActionRef,
  memberOrgs
}) {
  if (!showForm) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-base)', width: '90%', maxWidth: '900px', maxHeight: '90vh', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)', overflow: 'hidden' }}>
        <div className="modal-header" style={{ padding: '20px 30px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-panel)' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>{isEditing ? 'Edit Insight' : 'Share Insight'}</h2>
          <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '30px' }}>
          
          <div style={{ padding: '25px' }}>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="field-label">Insight ID</label>
                  <input className="field-input" disabled value={formData.case_id} style={{ opacity: 0.7 }} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="field-label">Submission Type <span className="field-required">*</span></label>
                  <select className="field-input" value={formData.submission_type} onChange={(e) => setFormData({...formData, submission_type: e.target.value})}>
                    <option value="IOC Hit">IOC Hit</option>
                    <option value="Threat Hunt Finding">Threat Hunt Finding</option>
                    <option value="Attack Artefact">Attack Artefact</option>
                    <option value="TTP/Adversary Behaviour">TTP/Adversary Behaviour</option>
                    <option value="Cyber Event">Cyber Event</option>
                    <option value="Recon/Intrusion Attempt">Recon/Intrusion Attempt</option>
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="field-label">Title</label>
                  <input className="field-input" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="Brief summary of the threat" />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="field-label">Confidence Level</label>
                  <select className="field-input" value={formData.confidence_level} onChange={(e) => setFormData({...formData, confidence_level: e.target.value})}>
                    <option value="">Select confidence level...</option>
                    <option value="High Confidence/High Impact">High Confidence/High Impact</option>
                    <option value="High Confidence/Moderate Impact">High Confidence/Moderate Impact</option>
                    <option value="Medium Confidence">Medium Confidence</option>
                    <option value="Low Confidence/Exploratory">Low Confidence/Exploratory</option>
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="field-label">Sighting/Observation Date (Local Time) <span className="field-required">*</span></label>
                  <input type="datetime-local" className="field-input" required value={formData.sighting_datetime} onChange={(e) => setFormData({...formData, sighting_datetime: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="insight-target-org" className="field-label">Target Member</label>
                  <select
                    id="insight-target-org"
                    className="field-input"
                    value={formData.target_org_id || 'ALL'}
                    onChange={(e) => setFormData({...formData, target_org_id: e.target.value})}
                  >
                    <option value="ALL">All Member</option>
                    {memberOrgs.map(org => (
                      <option key={org.id} value={org.id}>{org.name === 'Platform' ? 'ACSAC' : (org.name || 'ACSAC')}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="field-label">Description / Insights <span className="field-required">*</span></label>
                <textarea className="field-textarea" required rows={5} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Detailed explanation, context, and findings..." />
              </div>

              <div className="form-group">
                <label className="field-label">Indicators (IOCs, IPs, Hashes, Domains) <span className="field-required">*</span></label>
                <textarea className="field-textarea" required rows={4} value={formData.indicators} onChange={(e) => setFormData({...formData, indicators: e.target.value})} placeholder="Comma or newline separated indicators" />
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="field-label">TLP Level <span className="field-required">*</span></label>
                  <select className="field-input" required value={formData.tlp} onChange={(e) => setFormData({...formData, tlp: e.target.value})}>
                    <option value="" disabled>-- Select TLP Level --</option>
                    <option value="Red">Red</option>
                    <option value="Amber+Strict">Amber+Strict</option>
                    <option value="Amber">Amber</option>
                    <option value="Green">Green</option>
                    <option value="Clear">Clear</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="field-label">Tags (comma separated)</label>
                  <input className="field-input" value={formData.tags} onChange={(e) => setFormData({...formData, tags: e.target.value})} placeholder="e.g. ransomware, phishing" />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="submit-btn"
                  style={{ background: 'transparent', border: '1px solid var(--border-color)' }}
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  style={{ background: 'var(--bg-lighter)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}
                  onClick={() => { submitActionRef.current = 'DRAFT'; }}
                >
                  SAVE DRAFT
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  onClick={() => { submitActionRef.current = 'OPEN'; }}
                >
                  PUBLISH
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IsacSubmissionForm;
