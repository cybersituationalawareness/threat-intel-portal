import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import IncidentReportingModal from './IncidentReportingModal';
import Pagination from './Pagination';

function IncidentReportingDashboard() {
  const { authFetch, currentUser } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [columnFilters, setColumnFilters] = useState({});
  const handleColumnFilter = (key, value) => setColumnFilters(prev => ({...prev, [key]: value}));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [incidentToEdit, setIncidentToEdit] = useState(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, columnFilters, incidents]);

  const handleOpenForm = () => {
    setIncidentToEdit(null);
    setIsReadOnly(false);
    setIsModalOpen(true);
  };
  
  const handleEditIncident = () => {
    setIncidentToEdit(selectedIncident);
    setIsReadOnly(false);
    setIsModalOpen(true);
  };

  const handleViewIncident = () => {
    setIncidentToEdit(selectedIncident);
    setIsReadOnly(true);
    setIsModalOpen(true);
  };

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/v1/incidents');
      if (!res.ok) throw new Error('Failed to fetch incidents');
      const data = await res.json();
      setIncidents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [authFetch]);

  const filteredIncidents = incidents.filter(s => {
    if (filter === 'all') return true;
    return s.status === filter;
  });

  const totalPages = Math.ceil(filteredIncidents.length / ITEMS_PER_PAGE);
  const paginatedIncidents = filteredIncidents.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleStatusChange = async (incidentId, newStatus) => {
    try {
      const res = await authFetch(`/api/v1/incidents/${incidentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchIncidents();
        if (selectedIncident && selectedIncident.id === incidentId) {
          setSelectedIncident(prev => ({ ...prev, status: newStatus }));
        }
      } else {
        console.error("Failed to update status");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="main-content" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      
      {/* Left Panel: Feed */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-color)', backgroundColor: 'var(--bg-panel)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 25px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ fontWeight: '600', fontSize: '18px' }}>Incident Reporting</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="field-input"
              style={{ padding: '5px', fontSize: '13px', width: '150px' }}
            >
              <option value="all">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Investigating">Investigating</option>
              <option value="Closed">Closed</option>
            </select>
            <button className="submit-btn" style={{ padding: '8px 16px' }} onClick={handleOpenForm}>
              + Report Incident
            </button>
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: '20px' }}>Loading reports...</div>
          ) : filteredIncidents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>No incident reports found.</div>
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
                      {[...new Set((incidents || []).map(item => {
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
                      list={`dl-state`}
                      placeholder="Filter..." 
                      value={columnFilters.state || ''} 
                      onChange={e => handleColumnFilter('state', e.target.value)} 
                      style={{width: '100%', fontSize: '11px', padding: '2px', boxSizing: 'border-box', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px'}} 
                    />
                    <datalist id={`dl-state`}>
                      {[...new Set((incidents || []).map(item => {
                          if ('state' === 'case_id') return item.case_id;
                          if ('state' === 'title') return item.title;
                          if ('state' === 'type') return item.type;
                          if ('state' === 'category') return item.category;
                          if ('state' === 'target_org') return item.target_org?.name || 'All Members';
                          if ('state' === 'tlp') return item.tlp;
                          if ('state' === 'status') return item.my_status ? item.my_status.status : item.status;
                          if ('state' === 'classification') return item.classification;
                          if ('state' === 'state') return item.is_draft ? 'Draft' : (item.form_data?.reportType === 'Update to Previously Reported Incident' ? 'Updated' : 'Submitted');
                          if ('state' === 'org') return item.creator_org?.name;
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
                      {[...new Set((incidents || []).map(item => {
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
                      list={`dl-title`}
                      placeholder="Filter..." 
                      value={columnFilters.title || ''} 
                      onChange={e => handleColumnFilter('title', e.target.value)} 
                      style={{width: '100%', fontSize: '11px', padding: '2px', boxSizing: 'border-box', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px'}} 
                    />
                    <datalist id={`dl-title`}>
                      {[...new Set((incidents || []).map(item => {
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
                      list={`dl-date`}
                      placeholder="Filter..." 
                      value={columnFilters.date || ''} 
                      onChange={e => handleColumnFilter('date', e.target.value)} 
                      style={{width: '100%', fontSize: '11px', padding: '2px', boxSizing: 'border-box', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px'}} 
                    />
                    <datalist id={`dl-date`}>
                      {[...new Set((incidents || []).map(item => {
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
                      {[...new Set((incidents || []).map(item => {
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
                  <th style={{ padding: '10px 15px' }}>Case ID</th>
                  <th style={{ padding: '10px 15px' }}>State</th>
                  <th style={{ padding: '10px 15px' }}>Status</th>
                  <th style={{ padding: '10px 15px' }}>Title</th>
                  <th style={{ padding: '10px 15px' }}>Date</th>
                  <th style={{ padding: '10px 15px' }}>Organization</th>
                </tr>
              </thead>
              <tbody>
                {paginatedIncidents.map(inc => (
                  <tr 
                    key={inc.id}
                    onClick={() => { 
                      setSelectedIncident(inc);
                      setIncidentToEdit(inc);
                      setIsReadOnly(currentUser?.organization?.org_type === 'ACSAC');
                      setIsModalOpen(true);
                    }}
                    style={{ 
                      borderBottom: '1px solid var(--border-color)', 
                      cursor: 'pointer',
                      backgroundColor: selectedIncident?.id === inc.id ? 'var(--bg-glass)' : 'transparent',
                    }}
                    onMouseEnter={(e) => { if (selectedIncident?.id !== inc.id) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={(e) => { if (selectedIncident?.id !== inc.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <td style={{ padding: '10px 15px', color: 'var(--accent)', fontWeight: 'bold' }}>{inc.case_id}</td>
                    <td style={{ padding: '10px 15px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)' }}>
                        {inc.is_draft ? 'Draft' : (inc.form_data?.reportType === 'Update to Previously Reported Incident' ? 'Updated' : 'Submitted')}
                      </span>
                    </td>
                    <td style={{ padding: '10px 15px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)' }}>
                        {inc.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 15px', fontWeight: 'bold' }}>{inc.title || 'Untitled Incident'}</td>
                    <td style={{ padding: '10px 15px', color: 'var(--text-dim)', fontSize: '13px' }}>{new Date(inc.created_at).toLocaleString()}</td>
                    <td style={{ padding: '10px 15px', color: 'var(--text-dim)', fontSize: '13px' }}>{inc.organization?.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!loading && filteredIncidents.length > 0 && (
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        )}
      </div>

            {/* Slide-Out Side Drawer is now handled by IncidentReportingModal */}
      {(() => {
        const headerExtra = currentUser?.organization?.org_type === 'ACSAC' && incidentToEdit ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
            <strong style={{ fontSize: '13px', color: 'var(--accent)' }}>Status:</strong>
            <select
              value={incidentToEdit.status}
              onChange={(e) => {
                handleStatusChange(incidentToEdit.id, e.target.value);
                setIncidentToEdit({...incidentToEdit, status: e.target.value});
                setIncidents(prev => prev.map(i => i.id === incidentToEdit.id ? {...i, status: e.target.value} : i));
                if (selectedIncident && selectedIncident.id === incidentToEdit.id) {
                  setSelectedIncident({...selectedIncident, status: e.target.value});
                }
              }}
              style={{ background: 'var(--bg-panel)', color: 'var(--text-color)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '4px 8px', fontSize: '12px' }}
            >
              <option value="Open">Open</option>
              <option value="Investigating">Investigating</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        ) : null;

        return (
          <IncidentReportingModal 
            isOpen={isModalOpen} 
            onClose={() => {
              setIsModalOpen(false);
              setSelectedIncident(null);
            }} 
            onSuccess={() => {
              setIsModalOpen(false);
              setSelectedIncident(null);
              fetchIncidents();
            }}
            existingIncident={incidentToEdit}
            readOnly={isReadOnly}
            headerExtra={headerExtra}
          />
        );
      })()}
    </div>
  );
}

export default IncidentReportingDashboard;
