import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import IntelFeed from './IntelFeed';
import IntelForm from './IntelForm';
import AcsacIntelDetailDrawer from './AcsacIntelDetailDrawer';

function AcsacDashboard() {
  const { authFetch, currentUser } = useAuth();
  const [intels, setIntels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selectedIntel, setSelectedIntel] = useState(null);
  const [showIntelForm, setShowIntelForm] = useState(false);
  const [editingIntel, setEditingIntel] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const fetchIntels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/v1/intel/acsac');
      if (res.ok) {
        const data = await res.json();
        if (filter !== 'all') {
          setIntels(data.filter(i => i.type === filter));
        } else {
          setIntels(data);
        }
        
        setSelectedIntel(prev => {
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

  const handleSyncOG = async () => {
    setSyncing(true);
    try {
      const res = await authFetch('/api/v1/intel/sync-og', { method: 'POST' });
      if (res.ok) {
        fetchIntels();
      } else {
        const err = await res.json();
        alert('Sync failed: ' + (err.detail || 'Unknown error'));
      }
    } catch(err) {
      console.error(err);
      alert('Sync connection error');
    } finally {
      setSyncing(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await authFetch('/api/v1/intel/export/csv');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = 'intel_report.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(objectUrl);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert('Error exporting CSV');
    }
  };

  const handleCloseStatusClarification = async (statusId) => {
    try {
      const res = await authFetch(`/api/v1/intel/${selectedIntel.id}/status/${statusId}/clarification/close`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchIntels();
      }
    } catch (err) {
      console.error('Failed to close status clarification thread', err);
    }
  };

  const handleCloseResponseClarification = async (responseId) => {
    try {
      const res = await authFetch(`/api/v1/intel/${selectedIntel.id}/responses/${responseId}/clarification/close`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchIntels();
      }
    } catch (err) {
      console.error('Failed to close response clarification thread', err);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} selected item(s)?`)) return;

    try {
      const res = await authFetch('/api/v1/intel', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intel_ids: Array.from(selectedIds) })
      });
      
      if (res.ok) {
        setSelectedIds(new Set());
        fetchIntels();
      } else {
        const err = await res.json();
        alert('Delete failed: ' + (err.detail || 'Unknown error'));
      }
    } catch(err) {
      console.error(err);
      alert('Delete connection error');
    }
  };

  const handleEditSelected = () => {
    if (selectedIds.size !== 1) return;
    const intelToEdit = intels.find(i => i.id === Array.from(selectedIds)[0]);
    if (intelToEdit) {
      setEditingIntel(intelToEdit);
      setShowIntelForm(true);
    }
  };

  return (
    <div className="main-content">
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 25px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-glass)', gap: '10px' }}>
          <div style={{ fontWeight: '600', fontSize: '18px' }}>ACSAC Dashboard</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="submit-btn" onClick={handleExportCsv} style={{ padding: '8px 16px', fontSize: '14px', backgroundColor: 'transparent', border: '1px solid var(--border-color)' }}>
              Export CSV
            </button>
            {currentUser?.role === 'ADMIN' && (
              <button className="submit-btn" onClick={handleSyncOG} disabled={syncing} style={{ padding: '8px 16px', fontSize: '14px', backgroundColor: 'transparent', border: '1px solid var(--border-color)' }}>
                {syncing ? 'Syncing...' : 'Sync from OG'}
              </button>
            )}
            <button className="submit-btn" onClick={() => { setEditingIntel(null); setShowIntelForm(true); }} style={{ padding: '8px 16px', fontSize: '14px' }}>
              + CREATE ALERT OR ADVISORY
            </button>
          </div>
        </div>
        <IntelFeed 
          intels={intels} 
          loading={loading} 
          filter={filter} 
          onFilterChange={setFilter} 
          onIntelSelect={(intel) => {
            setSelectedIntel(intel);
          }} 
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onDeleteSelected={handleDeleteSelected}
          onEditSelected={handleEditSelected}
        />
      </div>

      <AcsacIntelDetailDrawer
        selectedIntel={selectedIntel}
        onClose={() => setSelectedIntel(null)}
        handleDownload={handleDownload}
        handleCloseStatusClarification={handleCloseStatusClarification}
        handleCloseResponseClarification={handleCloseResponseClarification}
        handleSendStatusClarification={handleSendStatusClarification}
        handleSendClarification={handleSendClarification}
      />

      {showIntelForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <IntelForm 
              currentUser={currentUser}
              onClose={() => { setShowIntelForm(false); setEditingIntel(null); }} 
              onSuccess={() => { setShowIntelForm(false); setEditingIntel(null); fetchIntels(); }} 
              initialData={editingIntel}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default AcsacDashboard;
