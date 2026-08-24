import React from 'react';
import FileUploadArea from './FileUploadArea';

const IncidentFormSection3 = ({
  formData,
  handleCIIChange,
  removeCII,
  addCII,
  dragActive,
  handleDrag,
  handleDrop,
  handleFileChange,
  attachments,
  removeAttachment
}) => {
  return (
    <div className="form-section">
      <h3>Section 3 – Affected Critical Information Infrastructure</h3>
      
      {formData.affectedCII.map((cii, index) => (
        <div key={index} className="repeating-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <h4>Affected CII #{index + 1}</h4>
            {index > 0 && <button type="button" className="btn-danger" onClick={() => removeCII(index)}>Remove</button>}
          </div>
          <div className="grid-2">
            <div className="form-group"><label>CII Name</label><input className="field-input" value={cii.ciiName} onChange={(e) => handleCIIChange(index, 'ciiName', e.target.value)} /></div>
            <div className="form-group"><label>CII Owner</label><input className="field-input" value={cii.ciiOwner} onChange={(e) => handleCIIChange(index, 'ciiOwner', e.target.value)} /></div>
            <div className="form-group"><label>Owner Email</label><input className="field-input" value={cii.ownerEmail} onChange={(e) => handleCIIChange(index, 'ownerEmail', e.target.value)} /></div>
            <div className="form-group"><label>Owner Telephone</label><input className="field-input" value={cii.ownerPhone} onChange={(e) => handleCIIChange(index, 'ownerPhone', e.target.value)} /></div>
            <div className="form-group"><label>Location</label><input className="field-input" value={cii.location} onChange={(e) => handleCIIChange(index, 'location', e.target.value)} /></div>
            <div className="form-group"><label>Purpose of CII</label><input className="field-input" value={cii.purpose} onChange={(e) => handleCIIChange(index, 'purpose', e.target.value)} /></div>
            <div className="form-group"><label>Operating System</label><input className="field-input" value={cii.os} onChange={(e) => handleCIIChange(index, 'os', e.target.value)} /></div>
            <div className="form-group"><label>Hardware Affected</label><input className="field-input" value={cii.hardware} onChange={(e) => handleCIIChange(index, 'hardware', e.target.value)} /></div>
            <div className="form-group"><label>Software Affected</label><input className="field-input" value={cii.software} onChange={(e) => handleCIIChange(index, 'software', e.target.value)} /></div>
            <div className="form-group"><label>Manufacturer</label><input className="field-input" value={cii.manufacturer} onChange={(e) => handleCIIChange(index, 'manufacturer', e.target.value)} /></div>
            <div className="form-group"><label>Vendor</label><input className="field-input" value={cii.vendor} onChange={(e) => handleCIIChange(index, 'vendor', e.target.value)} /></div>
            <div className="form-group"><label>Model Number</label><input className="field-input" value={cii.model} onChange={(e) => handleCIIChange(index, 'model', e.target.value)} /></div>
          </div>
          <div className="form-group" style={{ marginTop: '10px' }}>
            <label>Supporting Notes</label>
            <textarea className="field-textarea" rows="2" value={cii.notes} onChange={(e) => handleCIIChange(index, 'notes', e.target.value)} />
          </div>
        </div>
      ))}
      <button type="button" className="submit-btn" style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)' }} onClick={addCII}>
        + Add Another Affected CII
      </button>

      <h4 style={{ marginTop: '30px' }}>Attachment Upload</h4>
      <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Supported formats: PDF, DOCX, XLSX, PNG, JPG</p>
      
      <FileUploadArea
        dragActive={dragActive}
        handleDrag={handleDrag}
        handleDrop={handleDrop}
        handleFileChange={handleFileChange}
        attachments={attachments}
        removeAttachment={removeAttachment}
        idSuffix="-section3"
      />
    </div>
  );
};

export default IncidentFormSection3;
