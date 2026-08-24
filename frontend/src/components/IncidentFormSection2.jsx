import React from 'react';

const IncidentFormSection2 = ({ formData, handleChange, handleCheckboxGroup }) => {
  return (
    <div className="form-section">
      <h3>Section 2 – Incident Details</h3>
      
      <div className="form-group">
        <label className="field-label">When did the organisation become aware of the incident?</label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input type="date" className="field-input" name="awareDate" value={formData.awareDate} onChange={handleChange} />
          <input type="time" className="field-input" name="awareTime" value={formData.awareTime} onChange={handleChange} />
          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Singapore Time (GMT+8)</span>
        </div>
      </div>

      <div className="form-group">
        <label className="field-label">When was the incident reported to Sector Lead?</label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
          <input type="date" className="field-input" name="reportedDate" value={formData.reportedDate} onChange={handleChange} disabled={formData.sectorLeadSubmitting} />
          <input type="time" className="field-input" name="reportedTime" value={formData.reportedTime} onChange={handleChange} disabled={formData.sectorLeadSubmitting} />
        </div>
        <label style={{ fontSize: '13px' }}>
          <input type="checkbox" name="sectorLeadSubmitting" checked={formData.sectorLeadSubmitting} onChange={handleChange} /> Sector Lead is submitting this report
        </label>
      </div>

      <div className="form-group">
        <label className="field-label">Types of Threats / Incidents*</label>
        <div className="checkbox-grid">
          {['Denial of Service (DoS)', 'Distributed Denial of Service (DDoS)', 'Virus', 'Worm', 'Trojan', 'Intrusion', 'Unauthorised Access', 'Man-in-the-middle Attack', 'Other'].map(threat => (
            <label key={threat} style={{ fontSize: '13px' }}>
              <input type="checkbox" checked={formData.threatTypes.includes(threat)} onChange={(e) => handleCheckboxGroup(e, 'threatTypes', threat)} /> {threat}
            </label>
          ))}
        </div>
      </div>
      
      {formData.threatTypes.includes('Other') && (
        <div className="form-group">
          <label className="field-label">Specify Incident Type *</label>
          <input className="field-input" name="threatTypeOther" value={formData.threatTypeOther} onChange={handleChange} required />
        </div>
      )}

      <div className="form-group">
        <label className="field-label">Related Incident</label>
        <div style={{ display: 'flex', gap: '20px' }}>
          <label><input type="radio" name="relatedIncident" value="Yes" checked={formData.relatedIncident === 'Yes'} onChange={handleChange} /> Yes</label>
          <label><input type="radio" name="relatedIncident" value="No" checked={formData.relatedIncident === 'No'} onChange={handleChange} /> No</label>
        </div>
      </div>

      {formData.relatedIncident === 'Yes' && (
        <div className="form-group">
          <label className="field-label">Describe Relationship</label>
          <textarea className="field-textarea" name="relatedIncidentDesc" value={formData.relatedIncidentDesc} onChange={handleChange} rows="3" />
        </div>
      )}
    </div>
  );
};

export default IncidentFormSection2;
