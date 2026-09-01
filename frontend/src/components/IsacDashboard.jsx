import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import IsacFeedTable from './IsacFeedTable';
import IsacDetailDrawer from './IsacDetailDrawer';
import IsacSubmissionForm from './IsacSubmissionForm';

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
      const params = new URLSearchParams(window.location.search);
      const deepLinkId = params.get('isac_id');
      
      setSelectedSubmission(prev => {
        if (deepLinkId && !prev) {
          const linkedSub = data.find(item => item.id === deepLinkId || item.case_id === deepLinkId);
          if (linkedSub) {
            window.history.replaceState({}, document.title, window.location.pathname);
            return linkedSub;
          }
        }
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
          <IsacFeedTable
            loading={loading}
            submissions={submissions}
            filteredSubmissions={filteredSubmissions}
            columnFilters={columnFilters}
            handleColumnFilter={handleColumnFilter}
            selectedSubmission={selectedSubmission}
            setSelectedSubmission={setSelectedSubmission}
            setShowForm={setShowForm}
          />
        </div>
      </div>

      <IsacDetailDrawer
        selectedSubmission={selectedSubmission}
        setSelectedSubmission={setSelectedSubmission}
        currentUser={currentUser}
        handleEditClick={handleEditClick}
        handleEscalate={handleEscalate}
        handleCloseCommentThread={handleCloseCommentThread}
        handleSendComment={handleSendComment}
      />
      
      <IsacSubmissionForm
        showForm={showForm}
        setShowForm={setShowForm}
        isEditing={isEditing}
        formData={formData}
        setFormData={setFormData}
        handleSubmit={handleSubmit}
        submitActionRef={submitActionRef}
        memberOrgs={memberOrgs}
      />
    </div>
  );
}

export default IsacDashboard;
