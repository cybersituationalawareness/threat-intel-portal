import React from 'react';

const IncidentFormSection5 = ({ formData, handleChange }) => {
  return (
    <div className="form-section">
      <h3>Section 5 – Incident Handling Status</h3>
      
      <div className="form-group">
        <label className="field-label">Follow-Up Actions Taken</label>
        <textarea className="field-textarea" name="followUpActions" value={formData.followUpActions} onChange={handleChange} rows="5" />
      </div>

      <div className="form-group">
        <label className="field-label">Current Status</label>
        <select className="field-input" name="currentStatus" value={formData.currentStatus} onChange={handleChange}>
          <option value="Under Investigation">Under Investigation</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Contained">Contained</option>
          <option value="Resolved">Resolved</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      <div className="form-group">
        <label className="field-label">Next Course of Action</label>
        <textarea className="field-textarea" name="nextCourseOfAction" value={formData.nextCourseOfAction} onChange={handleChange} rows="3" />
      </div>

      <div className="form-group">
        <label className="field-label">Earliest Known Date of Compromise</label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
          <input type="date" className="field-input" name="earliestCompromiseDate" value={formData.earliestCompromiseDate} onChange={handleChange} disabled={formData.earliestCompromiseUnknown} />
          <input type="time" className="field-input" name="earliestCompromiseTime" value={formData.earliestCompromiseTime} onChange={handleChange} disabled={formData.earliestCompromiseUnknown} />
        </div>
        <label style={{ fontSize: '13px' }}>
          <input type="checkbox" name="earliestCompromiseUnknown" checked={formData.earliestCompromiseUnknown} onChange={handleChange} /> Unknown
        </label>
      </div>

      <div className="form-group">
        <label className="field-label">Source / Cause of Incident</label>
        <textarea className="field-textarea" name="sourceCause" value={formData.sourceCause} onChange={handleChange} rows="3" placeholder="Unknown, NIL, or details..." />
      </div>

      <div className="form-group">
        <label className="field-label">Reported to Law Enforcement?</label>
        <div style={{ display: 'flex', gap: '20px' }}>
          <label><input type="radio" name="reportedLE" value="Yes" checked={formData.reportedLE === 'Yes'} onChange={handleChange} /> Yes</label>
          <label><input type="radio" name="reportedLE" value="No" checked={formData.reportedLE === 'No'} onChange={handleChange} /> No</label>
        </div>
      </div>

      {formData.reportedLE === 'Yes' && (
        <div className="grid-2">
          <div className="form-group"><label>Agency Name</label><input className="field-input" name="leAgency" value={formData.leAgency} onChange={handleChange} /></div>
          <div className="form-group"><label>Report Reference Number</label><input className="field-input" name="leRefNumber" value={formData.leRefNumber} onChange={handleChange} /></div>
          <div className="form-group"><label>Date Reported</label><input type="date" className="field-input" name="leDate" value={formData.leDate} onChange={handleChange} /></div>
          <div className="form-group"><label>Remarks</label><input className="field-input" name="leRemarks" value={formData.leRemarks} onChange={handleChange} /></div>
        </div>
      )}
    </div>
  );
};

export default IncidentFormSection5;
