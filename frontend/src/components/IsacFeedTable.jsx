import React, { useState, useEffect } from 'react';
import Pagination from './Pagination';

const TLP_MAP = {
  'Red':         { label: 'TLP:RED',          background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' },
  'Amber+Strict':{ label: 'TLP:AMBER+STRICT', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' },
  'Amber':       { label: 'TLP:AMBER',        background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' },
  'Green':       { label: 'TLP:GREEN',        background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)' },
  'Clear':       { label: 'TLP:CLEAR',        background: 'rgba(255, 255, 255, 0.1)', color: '#e5e7eb', border: '1px solid rgba(255, 255, 255, 0.2)' },
};

function IsacFeedTable({
  loading,
  submissions,
  filteredSubmissions,
  columnFilters,
  handleColumnFilter,
  selectedSubmission,
  setSelectedSubmission,
  setShowForm
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [columnFilters, submissions]);

  const totalPages = Math.ceil(filteredSubmissions.length / ITEMS_PER_PAGE);
  const paginatedSubmissions = filteredSubmissions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  if (loading) {
    return <div style={{ padding: '20px' }}>Loading feed...</div>;
  }

  if (filteredSubmissions.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>No insights sharing data found.</div>;
  }

  return (
    <>
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
        {paginatedSubmissions.map(sub => {
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
    {filteredSubmissions.length > 0 && (
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    )}
    </>
  );
}

export default IsacFeedTable;
