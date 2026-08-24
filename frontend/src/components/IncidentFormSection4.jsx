import React from 'react';

const IncidentFormSection4 = ({ formData, handleChange }) => {
  return (
    <div className="form-section">
      <h3>Section 4 – Incident Details</h3>
      
      <div className="form-group">
        <label className="field-label">Incident Occurrence</label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
          {!formData.occurrenceTimeUnknown ? (
            <>
              <input type="date" className="field-input" name="occurrenceDate" value={formData.occurrenceDate} onChange={handleChange} />
              <input type="time" className="field-input" name="occurrenceTime" value={formData.occurrenceTime} onChange={handleChange} />
            </>
          ) : (
            <>
              <label>Date First Observed:</label>
              <input type="date" className="field-input" name="firstObservedDate" value={formData.firstObservedDate} onChange={handleChange} />
              <label>Time First Observed:</label>
              <input type="time" className="field-input" name="firstObservedTime" value={formData.firstObservedTime} onChange={handleChange} />
            </>
          )}
        </div>
        <label style={{ fontSize: '13px' }}>
          <input type="checkbox" name="occurrenceTimeUnknown" checked={formData.occurrenceTimeUnknown} onChange={handleChange} /> Occurrence Time Unknown
        </label>
      </div>

      <div className="form-group">
        <label className="field-label">How did the incident occur?</label>
        <textarea className="field-textarea" name="howOccurred" value={formData.howOccurred} onChange={handleChange} rows="5" placeholder="Minimum 10 characters..." />
      </div>

      <div className="form-group">
        <label className="field-label">How was the incident detected?</label>
        <textarea className="field-textarea" name="howDetected" value={formData.howDetected} onChange={handleChange} rows="5" placeholder="Minimum 10 characters..." />
      </div>

      <div className="form-group">
        <label className="field-label">Observed Effects</label>
        <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Prompt users to provide: Service disruption, Data loss, Integrity issues, Availability issues, Public impact, Operational impact</p>
        <textarea className="field-textarea" name="observedEffects" value={formData.observedEffects} onChange={handleChange} rows="5" />
      </div>

      <div className="form-group">
        <label className="field-label">Potential Impact on Other Assets</label>
        <div style={{ display: 'flex', gap: '20px' }}>
          <label><input type="radio" name="impactOtherAssets" value="Yes" checked={formData.impactOtherAssets === 'Yes'} onChange={handleChange} /> Yes</label>
          <label><input type="radio" name="impactOtherAssets" value="No" checked={formData.impactOtherAssets === 'No'} onChange={handleChange} /> No</label>
        </div>
      </div>
      {formData.impactOtherAssets === 'Yes' && (
        <div className="form-group">
          <textarea className="field-textarea" name="impactOtherAssetsDesc" value={formData.impactOtherAssetsDesc} onChange={handleChange} rows="3" placeholder="Explanation..." />
        </div>
      )}

      <div className="form-group">
        <label className="field-label">Potential Impact on Other CII Owners</label>
        <div style={{ display: 'flex', gap: '20px' }}>
          <label><input type="radio" name="impactOtherCII" value="Yes" checked={formData.impactOtherCII === 'Yes'} onChange={handleChange} /> Yes</label>
          <label><input type="radio" name="impactOtherCII" value="No" checked={formData.impactOtherCII === 'No'} onChange={handleChange} /> No</label>
        </div>
      </div>
      {formData.impactOtherCII === 'Yes' && (
        <div className="form-group">
          <textarea className="field-textarea" name="impactOtherCIIDesc" value={formData.impactOtherCIIDesc} onChange={handleChange} rows="3" placeholder="Explanation..." />
        </div>
      )}
    </div>
  );
};

export default IncidentFormSection4;
