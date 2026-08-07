import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';

const TLP_MAP = {
  'Red':         { label: 'TLP:RED',          background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' },
  'Amber+Strict':{ label: 'TLP:AMBER+STRICT', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' },
  'Amber':       { label: 'TLP:AMBER',        background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' },
  'Green':       { label: 'TLP:GREEN',        background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)' },
  'Clear':       { label: 'TLP:CLEAR',        background: 'rgba(255, 255, 255, 0.1)', color: '#e5e7eb', border: '1px solid rgba(255, 255, 255, 0.2)' },
};

function IsacDashboard() {
  const { authFetch, currentUser } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [memberOrgs, setMemberOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [columnFilters, setColumnFilters] = useState({});
  const handleColumnFilter = (key, value) => setColumnFilters(prev => ({...prev, [key]: value}));
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');

  const [isEditing, setIsEditing] = useState(false);
  const submitActionRef = useRef('OPEN');

  const [formData, setFormData] = useState({
    case_id: '',
    submission_type: 'IOC Hit',
    title: '',
    confidence_level: '',
    description: '',
    indicators: '',
    sighting_datetime: new Date().toISOString().substring(0, 16),
    tlp: '',
    tags: '',
    target_org_id: 'ALL',
    status: 'OPEN'
  });

  const handleOpenForm = async () => {
    setShowForm(true);
    setSelectedSubmission(null);
    setIsEditing(false);
    try {
      const res = await authFetch('/api/v1/isac/next-case-id');
      if (res.ok) {
        const data = await res.json();
        setFormData({
          case_id: data.next_case_id,
          submission_type: 'IOC Hit',
          title: '',
          confidence_level: '',
          description: '',
          indicators: '',
          sighting_datetime: new Date().toISOString().substring(0, 16),
          tlp: '',
          tags: '',
          target_org_id: 'ALL',
          status: 'OPEN'
        });
      }
    } catch(err) {
      console.error(err);
    }
  };

  const handleEditClick = () => {
    if (!selectedSubmission) return;
    setIsEditing(true);
    setShowForm(true);
    setFormData({
      case_id: selectedSubmission.case_id,
      submission_type: selectedSubmission.submission_type,
      title: selectedSubmission.title || '',
      confidence_level: selectedSubmission.confidence_level || '',
      description: selectedSubmission.description,
      indicators: selectedSubmission.indicators || '',
      sighting_datetime: new Date(selectedSubmission.sighting_datetime).toISOString().substring(0, 16),
      tlp: selectedSubmission.tlp,
      tags: selectedSubmission.tags.join(', '),
      target_org_id: selectedSubmission.target_org_id || 'ALL',
      status: selectedSubmission.status || 'OPEN'
    });
  };

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/v1/isac/submissions');
      if (!res.ok) throw new Error('Failed to fetch ISAC submissions');
      const data = await res.json();
      setSubmissions(data);
      setSelectedSubmission(prev => {
        if (prev) {
          return data.find(item => item.id === prev.id) || prev;
        }
        return prev;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCommentThread = async (submissionId) => {
    try {
      const response = await authFetch(`${process.env.REACT_APP_API_URL}/isac/submissions/${submissionId}/clarification/close`, {
        method: 'POST'
      });
      if (response.ok) {
        setSelectedSubmission(prev => ({ ...prev, status: 'CLOSED' }));
        fetchSubmissions();
      } else {
        console.error('Failed to close thread');
      }
    } catch (err) {
      console.error('Error closing thread:', err);
    }
  };

  const handleSendComment = async (submissionId, content) => {
    if (!content || !content.trim()) return;
    try {
      const res = await authFetch(`/api/v1/isac/submissions/${submissionId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() })
      });
      if (res.ok) {
        fetchSubmissions();
      }
    } catch (err) {
      console.error('Failed to send comment:', err);
    }
  };

  useEffect(() => {
    setSelectedSubmission(null);
    fetchSubmissions();
    authFetch('/api/v1/organizations')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMemberOrgs(data.filter(org => (org.org_type && org.org_type.toUpperCase() === 'ACSAC') || org.name === 'ACSAC'));
        }
      })
      .catch(err => console.error('Failed to fetch orgs:', err));
  }, [currentUser?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description || !formData.description.trim()) {
      alert("Description / Insights is required.");
      return;
    }
    if (!formData.indicators || !formData.indicators.trim()) {
      alert("Indicators is required.");
      return;
    }
    if (!formData.tlp || !formData.tlp.trim()) {
      alert("TLP Level is required.");
      return;
    }
    try {
      const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
      const payload = {
        ...formData,
        sighting_datetime: new Date(formData.sighting_datetime).toISOString(),
        tags: tagsArray,
        status: submitActionRef.current || 'OPEN',
        target_org_id: (formData.target_org_id && formData.target_org_id !== 'ALL') ? formData.target_org_id : null
      };
      
      let res;
      if (isEditing) {
        res = await authFetch(`/api/v1/isac/submissions/${selectedSubmission.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await authFetch('/api/v1/isac/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      
      if (!res.ok) throw new Error('Failed to submit ISAC post');
      
      const newSub = await res.json();
      if (isEditing) {
        setSubmissions(submissions.map(s => s.id === newSub.id ? newSub : s));
      } else {
        setSubmissions([newSub, ...submissions]);
      }
      
      setShowForm(false);
      setIsEditing(false);
      setSelectedSubmission(newSub);
    } catch (err) {
      console.error(err);
      alert('Error saving submission');
    }
  };

  const handleEscalate = async () => {
    if (!selectedSubmission) return;
    try {
      const res = await authFetch(`/api/v1/isac/submissions/${selectedSubmission.id}/escalate`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Escalate failed');
      
      setSelectedSubmission({ ...selectedSubmission, is_escalated: true });
      setSubmissions(submissions.map(sub => sub.id === selectedSubmission.id ? { ...sub, is_escalated: true } : sub));
      
      alert('Insight successfully escalated to a draft Alert for Admin Review!');
    } catch(err) {
      console.error(err);
      alert('Error escalating insight to alert.');
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await authFetch('/api/v1/isac/export/csv');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = 'isac_peer_sharing_report.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(objectUrl);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert('Error exporting CSV');
    }
  };

  const filteredSubmissions = submissions.filter(s => {
    if (filter === 'all') return true;
    return s.submission_type === filter;
  });

  return (
    <div className="main-content" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      
      {/* Left Panel: Feed */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-color)', backgroundColor: 'var(--bg-panel)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 25px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ fontWeight: '600', fontSize: '18px' }}>Insights Sharing</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="field-input"
              style={{ padding: '5px', fontSize: '13px', width: '150px' }}
            >
              <option value="all">All Types</option>
              <option value="IOC Hit">IOC Hit</option>
              <option value="Threat Hunt Finding">Threat Hunt Finding</option>
              <option value="Attack Artefact">Attack Artefact</option>
              <option value="TTP/Adversary Behaviour">TTP/Adversary Behaviour</option>
              <option value="Cyber Event">Cyber Event</option>
              <option value="Recon/Intrusion Attempt">Recon/Intrusion Attempt</option>
            </select>
            <button className="submit-btn" onClick={handleExportCsv} style={{ padding: '8px 16px', fontSize: '13px', backgroundColor: 'transparent', border: '1px solid var(--border-color)' }}>
              Export CSV
            </button>
            <button className="submit-btn" style={{ padding: '8px 16px' }} onClick={handleOpenForm}>
              + Share Insight
            </button>
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: '20px' }}>Loading feed...</div>
          ) : filteredSubmissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>No insights sharing data found.</div>
          ) : (
            <table className="intel-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                                <tr style={{ borderBottom: "none", backgroundColor: "var(--bg-glass)" }}>
                  <th style={{ padding: "4px 10px" }}>
                    <input 
                      list={`dl-case_id`}
                      placeholder="Filter..." 
                      value={columnFilters.case_id || ''} 
                      onChange={e => handleColumnFilter('case_id', e.target.value)} 
                      style={{width: '100%', fontSize: '11px', padding: '2px', boxSizing: 'border-box', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px'}} 
                    />
                    <datalist id={`dl-case_id`}>
                      {[...new Set((submissions || []).map(item => {
                          if ('case_id' === 'case_id') return item.case_id;
                          if ('case_id' === 'title') return item.title;
                          if ('case_id' === 'type') return item.type;
                          if ('case_id' === 'category') return item.category;
                          if ('case_id' === 'target_org') return item.target_org?.name || 'All Members';
                          if ('case_id' === 'tlp') return item.tlp;
                          if ('case_id' === 'status') return item.my_status ? item.my_status.status : item.status;
                          if ('case_id' === 'classification') return item.classification;
                          if ('case_id' === 'state') return item.is_draft ? 'Draft' : (item.form_data?.reportType === 'Update to Previously Reported Incident' ? 'Updated' : 'Submitted');
                          if ('case_id' === 'org') return item.creator_org?.name;
                          return null;
                      }).filter(Boolean))].map((val, idx) => (
                        <option key={idx} value={val} />
                      ))}
                    </datalist>
                  </th>
                  <th style={{ padding: "4px 10px" }}>
                    <input 
                      list={`dl-type`}
                      placeholder="Filter..." 
                      value={columnFilters.type || ''} 
                      onChange={e => handleColumnFilter('type', e.target.value)} 
                      style={{width: '100%', fontSize: '11px', padding: '2px', boxSizing: 'border-box', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px'}} 
                    />
                    <datalist id={`dl-type`}>
                      {[...new Set((submissions || []).map(item => {
                          if ('type' === 'case_id') return item.case_id;
                          if ('type' === 'title') return item.title;
                          if ('type' === 'type') return item.type;
                          if ('type' === 'category') return item.category;
                          if ('type' === 'target_org') return item.target_org?.name || 'All Members';
                          if ('type' === 'tlp') return item.tlp;
                          if ('type' === 'status') return item.my_status ? item.my_status.status : item.status;
                          if ('type' === 'classification') return item.classification;
                          if ('type' === 'state') return item.is_draft ? 'Draft' : (item.form_data?.reportType === 'Update to Previously Reported Incident' ? 'Updated' : 'Submitted');
                          if ('type' === 'org') return item.creator_org?.name;
                          return null;
                      }).filter(Boolean))].map((val, idx) => (
                        <option key={idx} value={val} />
                      ))}
                    </datalist>
                  </th>
                  <th style={{ padding: "4px 10px" }}>
                    <input 
                      list={`dl-title`}
                      placeholder="Filter..." 
                      value={columnFilters.title || ''} 
                      onChange={e => handleColumnFilter('title', e.target.value)} 
                      style={{width: '100%', fontSize: '11px', padding: '2px', boxSizing: 'border-box', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px'}} 
                    />
                    <datalist id={`dl-title`}>
                      {[...new Set((submissions || []).map(item => {
                          if ('title' === 'case_id') return item.case_id;
                          if ('title' === 'title') return item.title;
                          if ('title' === 'type') return item.type;
                          if ('title' === 'category') return item.category;
                          if ('title' === 'target_org') return item.target_org?.name || 'All Members';
                          if ('title' === 'tlp') return item.tlp;
                          if ('title' === 'status') return item.my_status ? item.my_status.status : item.status;
                          if ('title' === 'classification') return item.classification;
                          if ('title' === 'state') return item.is_draft ? 'Draft' : (item.form_data?.reportType === 'Update to Previously Reported Incident' ? 'Updated' : 'Submitted');
                          if ('title' === 'org') return item.creator_org?.name;
                          return null;
                      }).filter(Boolean))].map((val, idx) => (
                        <option key={idx} value={val} />
                      ))}
                    </datalist>
                  </th>
                  <th style={{ padding: "4px 10px" }}>
                    <input 
                      list={`dl-target_org`}
                      placeholder="Filter..." 
                      value={columnFilters.target_org || ''} 
                      onChange={e => handleColumnFilter('target_org', e.target.value)} 
                      style={{width: '100%', fontSize: '11px', padding: '2px', boxSizing: 'border-box', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px'}} 
                    />
                    <datalist id={`dl-target_org`}>
                      {[...new Set((submissions || []).map(item => {
                          if ('target_org' === 'case_id') return item.case_id;
                          if ('target_org' === 'title') return item.title;
                          if ('target_org' === 'type') return item.type;
                          if ('target_org' === 'category') return item.category;
                          if ('target_org' === 'target_org') return item.target_org?.name || 'All Members';
                          if ('target_org' === 'tlp') return item.tlp;
                          if ('target_org' === 'status') return item.my_status ? item.my_status.status : item.status;
                          if ('target_org' === 'classification') return item.classification;
                          if ('target_org' === 'state') return item.is_draft ? 'Draft' : (item.form_data?.reportType === 'Update to Previously Reported Incident' ? 'Updated' : 'Submitted');
                          if ('target_org' === 'org') return item.creator_org?.name;
                          return null;
                      }).filter(Boolean))].map((val, idx) => (
                        <option key={idx} value={val} />
                      ))}
                    </datalist>
                  </th>
                  <th style={{ padding: "4px 10px" }}>
                    <input 
                      list={`dl-tlp`}
                      placeholder="Filter..." 
                      value={columnFilters.tlp || ''} 
                      onChange={e => handleColumnFilter('tlp', e.target.value)} 
                      style={{width: '100%', fontSize: '11px', padding: '2px', boxSizing: 'border-box', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px'}} 
                    />
                    <datalist id={`dl-tlp`}>
                      {[...new Set((submissions || []).map(item => {
                          if ('tlp' === 'case_id') return item.case_id;
                          if ('tlp' === 'title') return item.title;
                          if ('tlp' === 'type') return item.type;
                          if ('tlp' === 'category') return item.category;
                          if ('tlp' === 'target_org') return item.target_org?.name || 'All Members';
                          if ('tlp' === 'tlp') return item.tlp;
                          if ('tlp' === 'status') return item.my_status ? item.my_status.status : item.status;
                          if ('tlp' === 'classification') return item.classification;
                          if ('tlp' === 'state') return item.is_draft ? 'Draft' : (item.form_data?.reportType === 'Update to Previously Reported Incident' ? 'Updated' : 'Submitted');
                          if ('tlp' === 'org') return item.creator_org?.name;
                          return null;
                      }).filter(Boolean))].map((val, idx) => (
                        <option key={idx} value={val} />
                      ))}
                    </datalist>
                  </th>
                  <th style={{ padding: "4px 10px" }}>
                    <input 
                      list={`dl-status`}
                      placeholder="Filter..." 
                      value={columnFilters.status || ''} 
                      onChange={e => handleColumnFilter('status', e.target.value)} 
                      style={{width: '100%', fontSize: '11px', padding: '2px', boxSizing: 'border-box', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px'}} 
                    />
                    <datalist id={`dl-status`}>
                      {[...new Set((submissions || []).map(item => {
                          if ('status' === 'case_id') return item.case_id;
                          if ('status' === 'title') return item.title;
                          if ('status' === 'type') return item.type;
                          if ('status' === 'category') return item.category;
                          if ('status' === 'target_org') return item.target_org?.name || 'All Members';
                          if ('status' === 'tlp') return item.tlp;
                          if ('status' === 'status') return item.my_status ? item.my_status.status : item.status;
                          if ('status' === 'classification') return item.classification;
                          if ('status' === 'state') return item.is_draft ? 'Draft' : (item.form_data?.reportType === 'Update to Previously Reported Incident' ? 'Updated' : 'Submitted');
                          if ('status' === 'org') return item.creator_org?.name;
                          return null;
                      }).filter(Boolean))].map((val, idx) => (
                        <option key={idx} value={val} />
                      ))}
                    </datalist>
                  </th>
                  <th style={{ padding: "4px 10px" }}>
                    <input 
                      list={`dl-date`}
                      placeholder="Filter..." 
                      value={columnFilters.date || ''} 
                      onChange={e => handleColumnFilter('date', e.target.value)} 
                      style={{width: '100%', fontSize: '11px', padding: '2px', boxSizing: 'border-box', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px'}} 
                    />
                    <datalist id={`dl-date`}>
                      {[...new Set((submissions || []).map(item => {
                          if ('date' === 'case_id') return item.case_id;
                          if ('date' === 'title') return item.title;
                          if ('date' === 'type') return item.type;
                          if ('date' === 'category') return item.category;
                          if ('date' === 'target_org') return item.target_org?.name || 'All Members';
                          if ('date' === 'tlp') return item.tlp;
                          if ('date' === 'status') return item.my_status ? item.my_status.status : item.status;
                          if ('date' === 'classification') return item.classification;
                          if ('date' === 'state') return item.is_draft ? 'Draft' : (item.form_data?.reportType === 'Update to Previously Reported Incident' ? 'Updated' : 'Submitted');
                          if ('date' === 'org') return item.creator_org?.name;
                          return null;
                      }).filter(Boolean))].map((val, idx) => (
                        <option key={idx} value={val} />
                      ))}
                    </datalist>
                  </th>
                  <th style={{ padding: "4px 10px" }}>
                    <input 
                      list={`dl-org`}
                      placeholder="Filter..." 
                      value={columnFilters.org || ''} 
                      onChange={e => handleColumnFilter('org', e.target.value)} 
                      style={{width: '100%', fontSize: '11px', padding: '2px', boxSizing: 'border-box', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px'}} 
                    />
                    <datalist id={`dl-org`}>
                      {[...new Set((submissions || []).map(item => {
                          if ('org' === 'case_id') return item.case_id;
                          if ('org' === 'title') return item.title;
                          if ('org' === 'type') return item.type;
                          if ('org' === 'category') return item.category;
                          if ('org' === 'target_org') return item.target_org?.name || 'All Members';
                          if ('org' === 'tlp') return item.tlp;
                          if ('org' === 'status') return item.my_status ? item.my_status.status : item.status;
                          if ('org' === 'classification') return item.classification;
                          if ('org' === 'state') return item.is_draft ? 'Draft' : (item.form_data?.reportType === 'Update to Previously Reported Incident' ? 'Updated' : 'Submitted');
                          if ('org' === 'org') return item.creator_org?.name;
                          return null;
                      }).filter(Boolean))].map((val, idx) => (
                        <option key={idx} value={val} />
                      ))}
                    </datalist>
                  </th>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-glass)' }}>
                  <th style={{ padding: '10px 15px' }}>Insight ID</th>
                  <th style={{ padding: '10px 15px' }}>Type</th>
                  <th style={{ padding: '10px 15px' }}>Title</th>
                  <th style={{ padding: '10px 15px' }}>Target Member</th>
                  <th style={{ padding: '10px 15px' }}>TLP</th>
                  <th style={{ padding: '10px 15px' }}>Status</th>
                  <th style={{ padding: '10px 15px' }}>Date</th>
                  <th style={{ padding: '10px 15px' }}>Organization</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map(sub => {
                  const tlpInfo = TLP_MAP[sub.tlp] || { label: sub.tlp || '-', background: 'rgba(255,255,255,0.1)', color: 'var(--text-color)', border: '1px solid var(--border-color)' };
                  return (
                    <tr 
                      key={sub.id}
                      onClick={() => { setSelectedSubmission(sub); setShowForm(false); }}
                      style={{ 
                        borderBottom: '1px solid var(--border-color)', 
                        cursor: 'pointer',
                        backgroundColor: selectedSubmission?.id === sub.id ? 'var(--bg-glass)' : 'transparent',
                      }}
                      onMouseEnter={(e) => { if (selectedSubmission?.id !== sub.id) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'; }}
                      onMouseLeave={(e) => { if (selectedSubmission?.id !== sub.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <td style={{ padding: '10px 15px', color: 'var(--accent)', fontWeight: 'bold' }}>{sub.case_id}</td>
                      <td style={{ padding: '10px 15px' }}>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)' }}>
                          {sub.submission_type}
                        </span>
                      </td>
                      <td style={{ padding: '10px 15px', fontWeight: 'bold' }}>{sub.title || 'Untitled Insight'}</td>
                      <td style={{ padding: '10px 15px', fontSize: '13px' }}>{sub.target_org ? (sub.target_org.name === 'Platform' ? 'ACSAC' : sub.target_org.name) : 'All Member'}</td>
                      <td style={{ padding: '10px 15px' }}>
                        <span style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          background: tlpInfo.background,
                          color: tlpInfo.color,
                          border: tlpInfo.border,
                          fontWeight: 'bold',
                          whiteSpace: 'nowrap'
                        }}>
                          {tlpInfo.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 15px' }}>
                        <span style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          backgroundColor: sub.status === 'DRAFT' ? 'transparent' : 'rgba(34, 197, 94, 0.1)',
                          color: sub.status === 'DRAFT' ? 'var(--text-dim)' : 'var(--accent)',
                          border: sub.status === 'DRAFT' ? '1px solid var(--border-color)' : '1px solid rgba(34, 197, 94, 0.3)'
                        }}>
                          {sub.status || 'OPEN'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 15px', color: 'var(--text-dim)', fontSize: '13px' }}>{new Date(sub.created_at).toLocaleString()}</td>
                      <td style={{ padding: '10px 15px', color: 'var(--text-dim)', fontSize: '13px' }}>{sub.organization?.name}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

            {/* Slide-Out Side Drawer */}
      {selectedSubmission && (
        <div className="side-drawer-overlay" onClick={() => setSelectedSubmission(null)}>
          <div className="side-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="side-drawer-header">
              <div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{selectedSubmission.title || 'Untitled Insight'}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
                  {selectedSubmission.case_id} • {selectedSubmission.submission_type}
                  {selectedSubmission.status === 'DRAFT' && (
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.15)', color: 'var(--text-dim)', marginLeft: '8px' }}>
                      DRAFT
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedSubmission(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <div className="side-drawer-content" style={{ padding: '20px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  {selectedSubmission.confidence_level && (
                    <div style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', display: 'inline-block' }}>
                      <strong>Confidence:</strong> {selectedSubmission.confidence_level}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  {currentUser.id === selectedSubmission.created_by_id && (
                    <button className="submit-btn" style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border-color)', fontSize: '12px' }} onClick={handleEditClick}>
                      Edit Insight
                    </button>
                  )}
                  {currentUser.organization.org_type === 'ACSAC' && (
                    <button 
                      className="submit-btn" 
                      style={{ 
                        background: selectedSubmission.is_escalated ? 'var(--bg-lighter)' : 'var(--alert-color)', 
                        color: selectedSubmission.is_escalated ? 'var(--text-dim)' : 'white', 
                        padding: '6px 12px',
                        fontSize: '12px',
                        cursor: selectedSubmission.is_escalated ? 'not-allowed' : 'pointer',
                        border: selectedSubmission.is_escalated ? '1px solid var(--border-color)' : 'none'
                      }} 
                      onClick={handleEscalate}
                      disabled={selectedSubmission.is_escalated}
                    >
                      {selectedSubmission.is_escalated ? 'Escalated to Alert' : 'Escalate to Alert'}
                    </button>
                  )}
                </div>
              </div>

              <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                Shared by <strong>{selectedSubmission.organization?.name}</strong> • Target: <strong>{selectedSubmission.target_org ? (selectedSubmission.target_org.name === 'Platform' ? 'ACSAC' : selectedSubmission.target_org.name) : 'All Member'}</strong> • Sighted on: {new Date(selectedSubmission.sighting_datetime).toLocaleString()}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: 'var(--accent)' }}>Description</h4>
                <p style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '13px', lineHeight: '1.6' }}>
                  {selectedSubmission.description}
                </p>
              </div>

              {selectedSubmission.indicators && (
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-dim)' }}>Indicators (IOCs)</h4>
                  <pre style={{ margin: 0, fontSize: '12px', color: '#ff7b72', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{selectedSubmission.indicators}</pre>
                </div>
              )}

              {/* Clarification Thread Section */}
              <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed var(--border-color)' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div>💬 Clarification Thread ({selectedSubmission.comments?.length || 0})</div>
                  {currentUser.organization.org_type === 'ACSAC' && selectedSubmission.status !== 'CLOSED' && (
                    <button onClick={() => handleCloseCommentThread(selectedSubmission.id)} style={{ padding: '2px 8px', fontSize: '11px', background: 'var(--alert-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close Thread</button>
                  )}
                </div>
                
                {selectedSubmission.comments && selectedSubmission.comments.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px', maxHeight: '200px', overflowY: 'auto', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                    {selectedSubmission.comments.map((comment, mIdx) => (
                      <div key={mIdx} style={{ fontSize: '12px', padding: '8px 10px', borderRadius: '6px', background: (comment.organization?.org_type === 'ACSAC' || comment.organization?.name === 'ACSAC') ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.05)', borderLeft: (comment.organization?.org_type === 'ACSAC' || comment.organization?.name === 'ACSAC') ? '3px solid #3b82f6' : '3px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px', color: 'var(--text-dim)' }}>
                          <span><strong>{comment.created_by?.name || 'Member'}</strong> ({comment.organization?.name || 'Organization'})</span>
                          <span>{new Date(comment.created_at).toLocaleString()}</span>
                        </div>
                        <div style={{ color: 'var(--text-color)', whiteSpace: 'pre-wrap' }}>{comment.content}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '10px', fontStyle: 'italic' }}>No clarifications yet.</div>
                )}

                {/* Add Comment Input */}
                {selectedSubmission.status !== 'CLOSED' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                    <input
                      type="text"
                      placeholder="Enter clarification..."
                      className="field-input"
                      style={{ flex: 1, padding: '8px 12px', fontSize: '12px', boxSizing: 'border-box', height: '36px' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          e.preventDefault();
                          handleSendComment(selectedSubmission.id, e.target.value.trim());
                          e.target.value = '';
                        }
                      }}
                    />
                    <button
                      className="submit-btn"
                      style={{ width: 'auto', minWidth: '80px', padding: '0 20px', height: '38px', fontSize: '12px', margin: 0, whiteSpace: 'nowrap' }}
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling;
                        if (input && input.value.trim()) {
                          handleSendComment(selectedSubmission.id, input.value.trim());
                          input.value = '';
                        }
                      }}
                    >
                      Send
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '10px', fontStyle: 'italic', padding: '10px', background: 'rgba(0,0,0,0.1)', borderRadius: '4px' }}>
                    🔒 This clarification thread has been closed.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
            {/* Share Insight Modal */}
      {showForm && (
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
  )}
  </div>
  );
}

export default IsacDashboard;
