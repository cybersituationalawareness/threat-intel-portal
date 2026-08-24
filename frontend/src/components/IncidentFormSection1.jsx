import React from 'react';

const IncidentFormSection1 = ({ formData, handleChange, memberOrgs }) => {
  return (
    <div className="form-section">
      <h3>Section 1 – General Information</h3>
      
      <div className="form-group">
        <label className="field-label">Reporting Party</label>
        <div style={{ display: 'flex', gap: '20px' }}>
          <label><input type="radio" name="reportingParty" value="Sector Lead" checked={formData.reportingParty === 'Sector Lead'} onChange={handleChange} /> Sector Lead</label>
          <label><input type="radio" name="reportingParty" value="CII Owner" checked={formData.reportingParty === 'CII Owner'} onChange={handleChange} /> CII Owner</label>
        </div>
      </div>

      <div className="form-group">
        <label className="field-label">Sector</label>
        <select className="field-input" name="sector" value={formData.sector} onChange={handleChange}>
          <option value="Aviation">Aviation</option>
		  <option value="Banking and Finance">Banking and Finance</option>
		  <option value="Energy">Energy</option>
		  <option value="Government">Government</option>
          <option value="Healthcare">Healthcare</option>
          <option value="Infocommunications">Infocommunications</option>
          <option value="Land Transport">Land Transport</option>
		  <option value="Maritime">Maritime</option>
		  <option value="Media">Media</option>
		  <option value="Security & Emergency Services">Energy</option>
		  <option value="Water">Water</option>
        </select>
      </div>

      <div className="form-group">
        <label className="field-label">Organisation</label>
        <select className="field-input" name="organisation" value={formData.organisation} onChange={handleChange}>
          <option value="">-- Select Organisation --</option>
          {memberOrgs.map(org => (
            <option key={org.id} value={org.name}>{org.name}</option>
          ))}
        </select>
      </div>

      <h4>Informant Information</h4>
      <div className="grid-2">
        <div className="form-group">
          <label className="field-label">Name</label>
          <input className="field-input" name="informantName" value={formData.informantName} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label className="field-label">Designation</label>
          <input className="field-input" name="informantDesignation" value={formData.informantDesignation} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label className="field-label">Organisation</label>
          <select className="field-input" name="informantOrganisation" value={formData.informantOrganisation} onChange={handleChange}>
            <option value="">-- Select Organisation --</option>
            {memberOrgs.map(org => (
              <option key={org.id} value={org.name}>{org.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="field-label">Email Address</label>
          <input className="field-input" type="email" name="informantEmail" value={formData.informantEmail} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label className="field-label">Telephone Number</label>
          <input className="field-input" name="informantPhone" value={formData.informantPhone} onChange={handleChange} />
        </div>
      </div>

      <div className="form-group">
        <label className="field-label">Report Type</label>
        <div style={{ display: 'flex', gap: '20px' }}>
          <label><input type="radio" name="reportType" value="New Incident" checked={formData.reportType === 'New Incident'} onChange={handleChange} /> New Incident</label>
          <label><input type="radio" name="reportType" value="Update to Previously Reported Incident" checked={formData.reportType === 'Update to Previously Reported Incident'} onChange={handleChange} /> Update to Previously Reported Incident</label>
        </div>
      </div>

      {formData.reportType === 'Update to Previously Reported Incident' && (
        <div className="form-group" style={{ background: 'var(--bg-panel)', padding: '15px', borderRadius: '5px' }}>
          <label className="field-label">Incident Reference Number</label>
          <input className="field-input" name="incidentRefNumber" value={formData.incidentRefNumber} onChange={handleChange} />
        </div>
      )}
      
      {formData.reportType === 'New Incident' && (
        <div className="form-group">
          <label className="field-label">Incident Classification</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <input type="radio" name="incidentClassification" value="Category 1" checked={formData.incidentClassification === 'Category 1'} onChange={handleChange} style={{ marginTop: '3px' }} />
              <div>
                <strong>Category 1</strong>
                <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Prescribed cybersecurity incident in respect of the provider-owned CII.</div>
              </div>
            </label>
            <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <input type="radio" name="incidentClassification" value="Category 2A" checked={formData.incidentClassification === 'Category 2A'} onChange={handleChange} style={{ marginTop: '3px' }} />
              <div>
                <strong>Category 2A</strong>
                <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Prescribed cybersecurity incident in respect of any computer or computer system under the owner’s control that is interconnected with or communicates with the CII.</div>
              </div>
            </label>
            <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <input type="radio" name="incidentClassification" value="Category 2B" checked={formData.incidentClassification === 'Category 2B'} onChange={handleChange} style={{ marginTop: '3px' }} />
              <div>
                <strong>Category 2B</strong>
                <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Prescribed cybersecurity incident in respect of supplier-controlled systems interconnected with or communicating with the CII.</div>
              </div>
            </label>
            <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <input type="radio" name="incidentClassification" value="Category 3A" checked={formData.incidentClassification === 'Category 3A'} onChange={handleChange} style={{ marginTop: '3px' }} />
              <div>
                <strong>Category 3A</strong>
                <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Other systems under owner’s control that may be attributed to APT, cause service disruption/degradation, or have public-visible effects.</div>
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentFormSection1;
