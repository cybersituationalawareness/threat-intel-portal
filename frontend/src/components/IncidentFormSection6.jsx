import React from 'react';
import FileUploadArea from './FileUploadArea';

const IncidentFormSection6 = ({
  formData,
  handleDynamicInfoChange,
  removeDynamicInfo,
  addDynamicInfo,
  existingAttachments,
  existingIncident,
  handleDeleteExistingAttachment,
  readOnly,
  dragActive,
  handleDrag,
  handleDrop,
  handleFileChange,
  attachments,
  removeAttachment
}) => {
  return (
    <div className="form-section">
      <h3>Section 6 – Other Information</h3>
      
      {formData.dynamicInfo.map((info, index) => (
        <div key={index} className="repeating-card" style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <select className="field-input" value={info.type} onChange={(e) => handleDynamicInfoChange(index, 'type', e.target.value)}>
              <option value="Indicators of Compromise">Indicators of Compromise</option>
              <option value="Threat Intelligence">Threat Intelligence</option>
              <option value="Affected IP Addresses">Affected IP Addresses</option>
              <option value="Domains">Domains</option>
              <option value="URLs">URLs</option>
              <option value="Hashes">Hashes</option>
              <option value="Attachments">Attachments</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: 2 }}>
            <input className="field-input" value={info.value} onChange={(e) => handleDynamicInfoChange(index, 'value', e.target.value)} placeholder="Details..." />
          </div>
          <button type="button" className="btn-danger" onClick={() => removeDynamicInfo(index)} style={{ padding: '10px 15px' }}>✖</button>
        </div>
      ))}
      <button type="button" className="submit-btn" style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)' }} onClick={addDynamicInfo}>
        + Add Information Field
      </button>

      <div className="form-section printable" style={{ marginTop: '30px' }}>
        <h3>Section 6 – Attachments (Optional)</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
          Provide relevant artifacts (e.g., malware samples, screenshots, logs).
        </p>
        
        {existingAttachments.length > 0 && (
          <div style={{ marginBottom: '15px' }}>
            <strong>Previously Uploaded:</strong>
            {existingAttachments.map((att, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px', background: 'var(--bg-glass)', margin: '5px 0' }}>
                <a href={`/api/v1/incidents/${existingIncident.id}/attachment/${att.filename}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                  📄 {att.filename}
                </a>
                {!readOnly && (
                  <button type="button" onClick={() => handleDeleteExistingAttachment(att.filename)} style={{ background: 'none', border: 'none', color: 'var(--alert-color)', cursor: 'pointer' }}>✖</button>
                )}
              </div>
            ))}
          </div>
        )}

        {!readOnly && (
          <FileUploadArea
            dragActive={dragActive}
            handleDrag={handleDrag}
            handleDrop={handleDrop}
            handleFileChange={handleFileChange}
            attachments={attachments}
            removeAttachment={removeAttachment}
            idSuffix="-section6"
          />
        )}
      </div>
    </div>
  );
};

export default IncidentFormSection6;
