import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import './IncidentReportingModal.css';
import IncidentFormSection1 from './IncidentFormSection1';
import IncidentFormSection2 from './IncidentFormSection2';
import IncidentFormSection3 from './IncidentFormSection3';
import IncidentFormSection4 from './IncidentFormSection4';
import IncidentFormSection5 from './IncidentFormSection5';
import IncidentFormSection6 from './IncidentFormSection6';
import IncidentFormSection7 from './IncidentFormSection7';


const getLocalCurrentDateTime = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toISOString().slice(11, 16);
  return { dateStr, timeStr };
};

function IncidentReportingModal({ isOpen, onClose, onSuccess, existingIncident, readOnly, headerExtra }) {
  const { authFetch, currentUser } = useAuth();
  
  // Form State
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  
  // Clarification Thread State
  const [clarificationMsg, setClarificationMsg] = useState('');

  const [memberOrgs, setMemberOrgs] = useState([]);

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const res = await fetch('/api/v1/organizations');
        if (res.ok) {
          const data = await res.json();
          setMemberOrgs(data.filter(org => org.org_type === 'MEMBER'));
        }
      } catch (err) {
        console.error("Failed to load orgs", err);
      }
    };
    fetchOrgs();
  }, []);

  const { dateStr: defaultDate, timeStr: defaultTime } = getLocalCurrentDateTime();

  const defaultFormData = {
    // Section 1
    reportingParty: 'Sector Lead',
    sector: 'Aviation',
    organisation: '',
    informantName: '',
    informantDesignation: '',
    informantOrganisation: '',
    informantEmail: '',
    informantPhone: '',
    reportType: 'New Incident',
    incidentRefNumber: '',
    incidentClassification: 'Category 1',
    
    // Section 2
    awareDate: defaultDate,
    awareTime: defaultTime,
    reportedDate: defaultDate,
    reportedTime: defaultTime,
    sectorLeadSubmitting: false,
    threatTypes: [],
    threatTypeOther: '',
    relatedIncident: 'No',
    relatedIncidentDesc: '',

    // Section 3
    affectedCII: [
      {
        ciiName: '', ciiOwner: '', ownerEmail: '', ownerPhone: '', 
        location: '', purpose: '', os: '', hardware: '', 
        software: '', manufacturer: '', vendor: '', model: '', notes: ''
      }
    ],

    // Section 4
    occurrenceDate: defaultDate,
    occurrenceTime: defaultTime,
    occurrenceTimeUnknown: false,
    firstObservedDate: defaultDate,
    firstObservedTime: defaultTime,
    howOccurred: '',
    howDetected: '',
    observedEffects: '',
    impactOtherAssets: 'No',
    impactOtherAssetsDesc: '',
    impactOtherCII: 'No',
    impactOtherCIIDesc: '',

    // Section 5
    followUpActions: '',
    currentStatus: 'Under Investigation',
    nextCourseOfAction: '',
    earliestCompromiseDate: defaultDate,
    earliestCompromiseTime: defaultTime,
    earliestCompromiseUnknown: false,
    sourceCause: '',
    reportedLE: 'No',
    leAgency: '',
    leRefNumber: '',
    leDate: defaultDate,
    leRemarks: '',

    // Section 6
    dynamicInfo: [
      { type: 'Indicators of Compromise', value: '' }
    ],

    // Section 7
    declaration: false,
    
    // Baseline needed by schema
    tlp: 'Amber',
    tags: ''
  };

  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setErrorMsg('');
      setAttachments([]);
      
      if (existingIncident) {
        setFormData(existingIncident.form_data || defaultFormData);
        setExistingAttachments(existingIncident.attachments || []);
      } else {
        setFormData(defaultFormData);
        setExistingAttachments([]);
      }
    }
  }, [isOpen, existingIncident]);

  if (!isOpen) return null;

  const handleDeleteExistingAttachment = async (filename) => {
    if (!existingIncident) return;
    try {
      const res = await authFetch(`/api/v1/incidents/${existingIncident.id}/attachment/${filename}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setExistingAttachments(prev => prev.filter(att => att.filename !== filename));
      } else {
        console.error("Failed to delete attachment");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendClarification = async () => {
    if (!clarificationMsg.trim() || !existingIncident) return;
    try {
      const res = await authFetch(`/api/v1/incidents/${existingIncident.id}/clarification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: clarificationMsg })
      });
      if (res.ok) {
        setClarificationMsg('');
        if (onSuccess) onSuccess(); // This triggers dashboard refresh which updates existingIncident
      } else {
        console.error("Failed to send clarification");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCloseClarification = async () => {
    if (!existingIncident) return;
    try {
      const res = await authFetch(`/api/v1/incidents/${existingIncident.id}/clarification/close`, {
        method: 'POST'
      });
      if (res.ok) {
        if (onSuccess) onSuccess();
      } else {
        console.error("Failed to close clarification thread");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCIIChange = (index, field, value) => {
    const newCII = [...formData.affectedCII];
    newCII[index][field] = value;
    setFormData(prev => ({ ...prev, affectedCII: newCII }));
  };

  const addCII = () => {
    setFormData(prev => ({
      ...prev,
      affectedCII: [...prev.affectedCII, {
        ciiName: '', ciiOwner: '', ownerEmail: '', ownerPhone: '', 
        location: '', purpose: '', os: '', hardware: '', 
        software: '', manufacturer: '', vendor: '', model: '', notes: ''
      }]
    }));
  };

  const removeCII = (index) => {
    const newCII = formData.affectedCII.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, affectedCII: newCII }));
  };

  const handleDynamicInfoChange = (index, field, value) => {
    const newInfo = [...formData.dynamicInfo];
    newInfo[index][field] = value;
    setFormData(prev => ({ ...prev, dynamicInfo: newInfo }));
  };

  const addDynamicInfo = () => {
    setFormData(prev => ({
      ...prev,
      dynamicInfo: [...prev.dynamicInfo, { type: 'Indicators of Compromise', value: '' }]
    }));
  };

  const removeDynamicInfo = (index) => {
    const newInfo = formData.dynamicInfo.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, dynamicInfo: newInfo }));
  };

  const handleCheckboxGroup = (e, field, value) => {
    const { checked } = e.target;
    setFormData(prev => {
      const currentList = prev[field];
      if (checked) {
        return { ...prev, [field]: [...currentList, value] };
      } else {
        return { ...prev, [field]: currentList.filter(item => item !== value) };
      }
    });
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setAttachments(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 6));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const validateMandatory = (isDraft) => {
    if (isDraft) return []; // Drafts skip mandatory checks
    const missing = [];
    if (!formData.declaration && currentStep === 6) missing.push("Declaration check");
    return missing;
  };

  const handleSubmit = async (isDraft = false) => {
    const missing = validateMandatory(isDraft);
    if (missing.length > 0) {
      setErrorMsg(`Missing mandatory fields: ${missing.join(', ')}`);
      return;
    }
    
    setLoading(true);
    setErrorMsg('');

    try {
      // Prepare payload
      const title = formData.reportType === 'Update to Previously Reported Incident' 
        ? `Update: ${formData.incidentRefNumber}` 
        : `Incident Report: ${formData.organisation || formData.informantOrganisation}`;
        
      const payload = {
        title: title,
        description: formData.howOccurred || "See form data",
        incident_date: formData.occurrenceDate ? new Date(`${formData.occurrenceDate}T${formData.occurrenceTime || '00:00'}`).toISOString() : new Date().toISOString(),
        tlp: formData.tlp,
        tags: [],
        form_data: formData,
        is_draft: isDraft
      };

      const url = existingIncident ? `/api/v1/incidents/${existingIncident.id}` : '/api/v1/incidents';
      const method = existingIncident ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to submit incident');
      
      const createdIncident = await res.json();
      
      // Upload attachments if any
      if (attachments.length > 0) {
        const formDataUpload = new FormData();
        attachments.forEach(file => {
          formDataUpload.append('files', file);
        });
        
        const uploadRes = await authFetch(`/api/v1/incidents/${createdIncident.id}/attachment`, {
          method: 'POST',
          body: formDataUpload
        });
        
        if (!uploadRes.ok) {
           console.error("Failed to upload attachment(s)");
        }
      }

      onSuccess();
    } catch(err) {
      console.error(err);
      setErrorMsg('Error submitting the incident report.');
    } finally {
      setLoading(false);
    }
  };

  const printHtml = () => {
    window.print();
  };

  const renderSection1 = () => (
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

  const renderSection2 = () => (
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

  const renderSection3 = () => (
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
      <div 
        className={`drag-drop-area ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
      >
        <p>Drag and drop files here or click to select</p>
        <input type="file" multiple onChange={handleFileChange} style={{ display: 'none' }} id="file-upload" />
        <label htmlFor="file-upload" className="submit-btn" style={{ cursor: 'pointer', display: 'inline-block', marginTop: '10px' }}>Browse Files</label>
      </div>
      {attachments.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          {attachments.map((file, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px', background: 'var(--bg-glass)', margin: '5px 0' }}>
              <span>{file.name}</span>
              <button type="button" onClick={() => removeAttachment(idx)} style={{ background: 'none', border: 'none', color: 'var(--alert-color)', cursor: 'pointer' }}>✖</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSection4 = () => (
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

  const renderSection5 = () => (
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

  const renderSection6 = () => (
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

      <div className="form-section printable">
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
        <>
          <div 
            className={`drag-drop-area ${dragActive ? 'active' : ''}`}
            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          >
            <p>Drag and drop files here or click to select</p>
            <input type="file" multiple onChange={handleFileChange} style={{ display: 'none' }} id="file-upload-section6" />
            <label htmlFor="file-upload-section6" className="submit-btn" style={{ cursor: 'pointer', display: 'inline-block', marginTop: '10px' }}>Browse Files</label>
          </div>
          {attachments.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              {attachments.map((file, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px', background: 'var(--bg-glass)', margin: '5px 0' }}>
                  <span>{file.name}</span>
                  <button type="button" onClick={() => removeAttachment(idx)} style={{ background: 'none', border: 'none', color: 'var(--alert-color)', cursor: 'pointer' }}>✖</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
    </div>
  );

  const renderSection7 = () => {
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

  return (
    <div className="side-drawer-overlay" onClick={onClose}>
      <div className="side-drawer wide" onClick={(e) => e.stopPropagation()}>
        <div className="side-drawer-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h2>Incident Reporting Form</h2>
            {headerExtra}
          </div>
          <button className="close-btn" onClick={onClose}>✖</button>
        </div>
        
        <div className="modal-progress">
          {[1,2,3,4,5,6].map(step => (
            <div key={step} className={`progress-step ${currentStep >= step ? 'active' : ''}`} onClick={() => setCurrentStep(step)}>
              {step}
            </div>
          ))}
        </div>

        <div className="side-drawer-content" style={{ padding: '30px' }}>
          {errorMsg && <div className="error-alert">{errorMsg}</div>}
          
          <fieldset disabled={readOnly} style={{ border: 'none', padding: 0, margin: 0, minWidth: 0 }}>
            {currentStep === 1 && <IncidentFormSection1 formData={formData} handleChange={handleChange} memberOrgs={memberOrgs} />}
            {currentStep === 2 && (
              <>
                <IncidentFormSection2 formData={formData} handleChange={handleChange} handleCheckboxGroup={handleCheckboxGroup} />
                <IncidentFormSection3 
                  formData={formData} 
                  handleCIIChange={handleCIIChange} 
                  removeCII={removeCII} 
                  addCII={addCII} 
                  dragActive={dragActive}
                  handleDrag={handleDrag}
                  handleDrop={handleDrop}
                  handleFileChange={handleFileChange}
                  attachments={attachments}
                  removeAttachment={removeAttachment}
                />
              </>
            )}
            {currentStep === 3 && <IncidentFormSection4 formData={formData} handleChange={handleChange} />}
            {currentStep === 4 && <IncidentFormSection5 formData={formData} handleChange={handleChange} />}
            {currentStep === 5 && (
              <IncidentFormSection6 
                formData={formData} 
                handleDynamicInfoChange={handleDynamicInfoChange} 
                removeDynamicInfo={removeDynamicInfo} 
                addDynamicInfo={addDynamicInfo}
                existingAttachments={existingAttachments}
                existingIncident={existingIncident}
                handleDeleteExistingAttachment={handleDeleteExistingAttachment}
                readOnly={readOnly}
                dragActive={dragActive}
                handleDrag={handleDrag}
                handleDrop={handleDrop}
                handleFileChange={handleFileChange}
                attachments={attachments}
                removeAttachment={removeAttachment}
              />
            )}
            {currentStep === 6 && <IncidentFormSection7 formData={formData} handleChange={handleChange} validateMandatory={() => validateMandatory(false)} />}
          </fieldset>
          
          {/* Clarification Thread Section */}
          {existingIncident && !existingIncident.is_draft && (
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px dashed var(--border-color)' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--accent)' }}>
                💬 Clarification Thread ({existingIncident.clarification_thread?.length || 0})
              </div>
              
              {existingIncident.clarification_thread && existingIncident.clarification_thread.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px', maxHeight: '300px', overflowY: 'auto', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                  {existingIncident.clarification_thread.map((msg, mIdx) => (
                    <div key={mIdx} style={{ fontSize: '13px', padding: '10px', borderRadius: '6px', background: msg.sender_org === 'ACSAC' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.05)', borderLeft: msg.sender_org === 'ACSAC' ? '3px solid #3b82f6' : '3px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px', color: 'var(--text-dim)' }}>
                        <span><strong>{msg.sender_name}</strong> ({msg.sender_org})</span>
                        <span>{new Date(msg.created_at).toLocaleString()}</span>
                      </div>
                      <div style={{ color: 'var(--text-color)', whiteSpace: 'pre-wrap' }}>{msg.message}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: '15px' }}>
                  No clarification messages yet. You can reply or ask questions below.
                </div>
              )}
              
              {existingIncident.clarification_is_open !== false ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Enter clarification message..."
                    className="field-input"
                    value={clarificationMsg}
                    onChange={(e) => setClarificationMsg(e.target.value)}
                    style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'white' }}
                  />
                  <button className="submit-btn" onClick={handleSendClarification} disabled={!clarificationMsg.trim()}>Send</button>
                  {readOnly && (!existingIncident || existingIncident.organization?.org_type !== 'ACSAC' || currentUser?.role === 'ADMIN') && (
                    <button className="submit-btn" style={{ background: 'var(--alert-color)' }} onClick={handleCloseClarification}>
                      Close Thread
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--alert-color)', fontStyle: 'italic', marginTop: '10px' }}>
                  This clarification thread has been closed.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {currentStep > 1 && <button className="submit-btn" style={{ background: 'transparent', border: '1px solid var(--border-color)' }} onClick={prevStep}>Previous</button>}
          
          {currentStep < 6 && <button className="submit-btn" onClick={nextStep}>Next</button>}
          
          {currentStep === 6 && (
            <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
              <button className="submit-btn" style={{ background: 'var(--bg-panel)' }} onClick={printHtml}>Export PDF (Print)</button>
              
              {!readOnly && (!existingIncident || existingIncident.is_draft) && (
                <button className="submit-btn" style={{ background: 'var(--bg-glass)', border: '1px solid var(--text-dim)' }} onClick={() => handleSubmit(true)} disabled={loading}>
                  {loading ? 'Saving...' : 'Save as Draft'}
                </button>
              )}
              
              {!readOnly && (
                <button className="submit-btn" onClick={() => handleSubmit(false)} disabled={loading || !formData.declaration}>
                  {loading ? 'Submitting...' : (existingIncident && !existingIncident.is_draft ? 'Update Incident Report' : 'Submit Incident Report')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default IncidentReportingModal;
