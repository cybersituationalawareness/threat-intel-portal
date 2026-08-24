import React from 'react';

const IncidentFormSection7 = ({ formData, handleChange, validateMandatory }) => {
  const missing = validateMandatory();
  
  return (
    <div className="form-section printable">
      <h3>Section 7 – Review & Submission</h3>
      
      {missing.length > 0 && (
        <div style={{ background: 'var(--alert-color)', color: 'white', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
          <strong>Missing Mandatory Fields:</strong>
          <ul style={{ margin: '5px 0 0 20px', fontSize: '13px' }}>
            {missing.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}

      <div className="summary-box">
        <h4>Section 1 – General</h4>
        <p><strong>Party:</strong> {formData.reportingParty} ({formData.sector})</p>
        <p><strong>Informant:</strong> {formData.informantName} - {formData.informantDesignation} ({formData.informantOrganisation})</p>
        
        <h4>Section 2 – Incident Details</h4>
        <p><strong>Aware Date:</strong> {formData.awareDate} {formData.awareTime}</p>
        <p><strong>Threats:</strong> {formData.threatTypes.join(', ')}</p>

        <h4>Section 3 – Affected CII ({formData.affectedCII.length})</h4>
        {formData.affectedCII.map((cii, i) => (
          <p key={i}>#{i+1}: {cii.ciiName} - {cii.ciiOwner}</p>
        ))}
        
        <h4>Section 4 – Occurrence</h4>
        <p><strong>How Occurred:</strong> {formData.howOccurred}</p>
        
        <h4>Section 5 – Status</h4>
        <p><strong>Current Status:</strong> {formData.currentStatus}</p>
      </div>

      <div className="form-group" style={{ marginTop: '20px', padding: '15px', background: 'var(--bg-glass)', borderRadius: '5px' }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
          <input type="checkbox" name="declaration" checked={formData.declaration} onChange={handleChange} style={{ marginTop: '4px' }} />
          <span>I confirm that the information provided is accurate to the best of my knowledge. *</span>
        </label>
      </div>
    </div>
  );
};

export default IncidentFormSection7;
