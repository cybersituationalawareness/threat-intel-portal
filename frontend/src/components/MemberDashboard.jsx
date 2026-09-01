import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import IntelFeed from './IntelFeed';
import MemberIntelDetailDrawer from './MemberIntelDetailDrawer';
import ResponseFormModal from './ResponseFormModal';
import './IncidentReportingModal.css';

const isIOC = (category) => category === 'Indicator of Compromise' || category === 'Indicators of Compromise' || category === 'IOC' || category === 'IOCs';
const isThreatHunt = (category) => category === 'Threat Hunt Package' || category === 'Threat Hunt Packages' || category === 'Threat Hunt';
const isOtherCategory = (category) => !category || category === 'Other' || category.startsWith('Other - ');

const getAffectedQuestionLabel = (category) => {
  if (category === 'Exploited Vulnerabilities') return 'Affected by Exploited Vulnerability ?';
  if (isIOC(category)) return 'IOC Hit';
  if (category === 'Campaign') return 'Affected by Campaign ?';
  if (isThreatHunt(category)) return 'MALICIOUS/SUSPICIOUS/ABNORMAL ACTIVITIES DETECTED THROUGH THE USE OF THREAT HUNT PACKAGE ?';
  if (category === 'RFI') return 'Applicable / Affected by RFI ?';
  return `Affected by ${category || 'Alert / Advisory'} ?`;
};

function MemberDashboard() {
  const { authFetch } = useAuth();
  const [intels, setIntels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedIntel, setSelectedIntel] = useState(null);
  const [editingResponse, setEditingResponse] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);

  const fetchIntels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/v1/intel/member');
      if (res.ok) {
        const data = await res.json();
        if (filter !== 'all') {
          setIntels(data.filter(i => i.type === filter));
        } else {
          setIntels(data);
        }
        
        // Handle deep linking
        const params = new URLSearchParams(window.location.search);
        const deepLinkId = params.get('intel_id');

        setSelectedIntel(prev => {
          if (deepLinkId && !prev) {
            const linkedIntel = data.find(i => i.id === deepLinkId || i.case_id === deepLinkId);
            if (linkedIntel) {
              window.history.replaceState({}, document.title, window.location.pathname);
              return linkedIntel;
            }
          }
          if (prev) {
            return data.find(i => i.id === prev.id) || prev;
          }
          return prev;
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [authFetch, filter]);

  useEffect(() => {
    fetchIntels();
  }, [fetchIntels]);

  useEffect(() => {
    if (selectedIntel) {
      const updatedIntel = intels.find(i => i.id === selectedIntel.id);
      if (updatedIntel) {
        setSelectedIntel(updatedIntel);
      }
    }
  }, [intels]);

  const handleAcknowledge = async () => {
    if (!selectedIntel) return;
    try {
      await authFetch(`/api/v1/intel/${selectedIntel.id}/acknowledge`, { method: 'POST' });
      fetchIntels();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEdit = (resp) => {
    setEditingResponse(resp);
    setShowResponseModal(true);
  };

  const openNewResponseModal = () => {
    setEditingResponse(null);
    setShowResponseModal(true);
  };

  const handleSendClarification = async (intelId, responseId, messageText) => {
    if (!messageText || !messageText.trim()) return;
    try {
      const url = `/api/v1/intel/${intelId}/responses/${responseId}/clarification`;
      await authFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText.trim() })
      });
      fetchIntels();
    } catch(err) {
      console.error(err);
    }
  };

  const handleSendStatusClarification = async (intelId, statusId, messageText) => {
    if (!messageText || !messageText.trim()) return;
    try {
      const url = `/api/v1/intel/${intelId}/status/${statusId}/clarification`;
      await authFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText.trim() })
      });
      fetchIntels();
    } catch(err) {
      console.error(err);
    }
  };

  const handleDownload = async (e, url, filename) => {
    e.preventDefault();
    try {
      const res = await authFetch(url);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error(err);
      alert('Failed to download file.');
    }
  };

  return (
    <div className="main-content">
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 25px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-glass)', gap: '10px' }}>
          <div style={{ fontWeight: '600', fontSize: '18px' }}>Member Dashboard</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="submit-btn" onClick={(e) => handleDownload(e, '/api/v1/intel/export/csv', 'my_intel_report.csv')} style={{ padding: '8px 16px', fontSize: '14px', backgroundColor: 'transparent', border: '1px solid var(--border-color)' }}>
              Export CSV
            </button>
          </div>
        </div>

        <IntelFeed 
          intels={intels} 
          loading={loading} 
          filter={filter} 
          onFilterChange={setFilter} 
          onIntelSelect={(item) => {
            setSelectedIntel(item);
            setEditingResponse(null);
          }}
        />
      </div>

      <MemberIntelDetailDrawer
        selectedIntel={selectedIntel}
        onClose={() => setSelectedIntel(null)}
        handleDownload={handleDownload}
        handleAcknowledge={handleAcknowledge}
        openNewResponseModal={openNewResponseModal}
        handleStartEdit={handleStartEdit}
        handleSendClarification={handleSendClarification}
      />

      {showResponseModal && (
        <ResponseFormModal
          selectedIntel={selectedIntel}
          editingResponse={editingResponse}
          onClose={() => setShowResponseModal(false)}
          onSuccess={() => {
            setShowResponseModal(false);
            fetchIntels();
          }}
        />
      )}
    </div>
  );
}

export default MemberDashboard;
