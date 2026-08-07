import React, { useState } from 'react';
import { useAuth } from '../AuthContext';

const TLP_MAP = {
  'Red':         { label: 'TLP:RED',          cls: 'tlp-red'          },
  'Amber+Strict':{ label: 'TLP:AMBER+STRICT', cls: 'tlp-amber-strict' },
  'Amber':       { label: 'TLP:AMBER',         cls: 'tlp-amber'        },
  'Green':       { label: 'TLP:GREEN',         cls: 'tlp-green'        },
  'Clear':       { label: 'TLP:CLEAR',         cls: 'tlp-clear'        },
};

function formatRelTime(dateStr) {
  const ms = Date.now() - new Date(dateStr).getTime();
  const m  = Math.floor(ms / 60_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function getTargetDueDate(intel) {
  if (!intel.has_sla || intel.sla_value === null || intel.sla_value === undefined || !intel.published_at) {
    return null;
  }
  const date = new Date(intel.published_at);
  if (isNaN(date.getTime())) return null;
  const val = Number(intel.sla_value) || 0;
  const unit = (intel.sla_unit || 'day').toLowerCase();
  if (unit.startsWith('hour')) {
    date.setHours(date.getHours() + val);
  } else if (unit.startsWith('week')) {
    date.setDate(date.getDate() + val * 7);
  } else if (unit.startsWith('month')) {
    date.setMonth(date.getMonth() + val);
  } else if (unit.startsWith('year')) {
    date.setFullYear(date.getFullYear() + val);
  } else {
    date.setDate(date.getDate() + val);
  }
  return date;
}

export function formatTargetDueDate(intel) {
  const date = getTargetDueDate(intel);
  if (!date) return '-';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = String(date.getDate()).padStart(2, '0');
  const m = months[date.getMonth()];
  const y = date.getFullYear();
  return `${d} ${m} ${y}`;
}

export function getSlaRemarks(intel) {
  const dueDate = getTargetDueDate(intel);
  if (!intel.has_sla || !dueDate) {
    return { label: '-', cls: 'remark-none' };
  }
  const isOverdue = Date.now() > dueDate.getTime();

  if (intel.my_status) {
    const status = intel.my_status.status;
    const hasResponded = intel.type === 'Advisory'
      ? ['ACKNOWLEDGED', 'INVESTIGATING', 'RESPONDED', 'UPDATED', 'CLOSED'].includes(status)
      : ['RESPONDED', 'UPDATED', 'CLOSED'].includes(status);
    if (hasResponded) {
      if (intel.my_responses && intel.my_responses.length > 0) {
        const latestResp = intel.my_responses[intel.my_responses.length - 1];
        if (latestResp.sla_met === false) {
          return { label: intel.type === 'Advisory' ? 'Acknowledged (Overdue)' : 'Responded (Overdue)', cls: 'remark-overdue' };
        }
        return { label: intel.type === 'Advisory' ? 'Acknowledged (On Time)' : 'Responded (On Time)', cls: 'remark-met' };
      }
      return { label: intel.type === 'Advisory' ? 'Acknowledged' : 'Responded', cls: 'remark-met' };
    }
    if (isOverdue) {
      return { label: 'Overdue', cls: 'remark-overdue' };
    }
    return { label: 'On Track', cls: 'remark-pending' };
  }

  if (intel.status === 'CLOSED') {
    return { label: 'Closed', cls: 'remark-none' };
  }
  if (intel.member_statuses && intel.member_statuses.length > 0) {
    const pendingCount = intel.type === 'Advisory'
      ? intel.member_statuses.filter(st => st.status === 'UNACKNOWLEDGED').length
      : intel.member_statuses.filter(st => ['UNACKNOWLEDGED', 'ACKNOWLEDGED', 'INVESTIGATING'].includes(st.status)).length;
    if (pendingCount === 0) {
      return { label: intel.type === 'Advisory' ? 'All Acknowledged' : 'All Responded', cls: 'remark-met' };
    }
    if (isOverdue) {
      return { label: `Overdue (${pendingCount} pending)`, cls: 'remark-overdue' };
    }
    return { label: 'On Track', cls: 'remark-pending' };
  }
  if (isOverdue) {
    return { label: 'Overdue', cls: 'remark-overdue' };
  }
  return { label: 'On Track', cls: 'remark-pending' };
}

function IntelRow({ intel, onSelect, selected, onToggleSelect }) {
  const { authFetch } = useAuth();

  const typeClass   = intel.type === 'Alert' ? 'alert' : 'advisory';
  const tlpInfo     = TLP_MAP[intel.tlp] || { label: intel.tlp, cls: 'tlp-clear' };
  
  // Status logic: if Member dashboard, show my_status, otherwise intel.status
  const displayStatus = intel.my_status ? intel.my_status.status : intel.status;
  const dueDateFormatted = formatTargetDueDate(intel);
  const remarksInfo = getSlaRemarks(intel);

  const handleRowClick = () => {
    onSelect && onSelect();
  };


  let slaStatusElement = null;
  
  let clarificationsCount = 0;
  if (intel.my_status) {
      if (intel.my_status.clarification_thread && intel.my_status.clarification_is_open !== false) clarificationsCount += intel.my_status.clarification_thread.length;
      if (intel.my_responses) {
          intel.my_responses.forEach(r => {
              if (r.clarification_thread && r.clarification_is_open !== false) clarificationsCount += r.clarification_thread.length;
          });
      }
  } else if (intel.member_statuses) {
      intel.member_statuses.forEach(st => {
          if (st.clarification_thread && st.clarification_is_open !== false) clarificationsCount += st.clarification_thread.length;
      });
      if (intel.responses) {
          intel.responses.forEach(r => {
              if (r.clarification_thread && r.clarification_is_open !== false) clarificationsCount += r.clarification_thread.length;
          });
      }
  }
  
  let responseProgress = null;
  if (!intel.my_status && intel.member_statuses && intel.member_statuses.length > 0) {
    const total = intel.member_statuses.length;
    if (intel.type === 'Advisory') {
      const acknowledged = intel.member_statuses.filter(st => ['ACKNOWLEDGED', 'INVESTIGATING', 'RESPONDED', 'UPDATED', 'CLOSED'].includes(st.status)).length;
      responseProgress = `${acknowledged}/${total} Acknowledged`;
    } else {
      const responded = intel.member_statuses.filter(st => ['RESPONDED', 'UPDATED', 'CLOSED'].includes(st.status)).length;
      responseProgress = `${responded}/${total} Responded`;
    }
  }
  if (intel.has_sla) {
    if (intel.my_responses && intel.my_responses.length > 0) {
      const latestResp = intel.my_responses[intel.my_responses.length - 1];
      if (latestResp.sla_met === true) {
        slaStatusElement = <div style={{ color: 'var(--accent)', fontSize: '11px', fontWeight: 'bold', marginTop: '2px' }}>Met</div>;
      } else if (latestResp.sla_met === false) {
        slaStatusElement = <div style={{ color: 'var(--alert-color)', fontSize: '11px', fontWeight: 'bold', marginTop: '2px' }}>Not Met</div>;
      }
    } else if (intel.responses && intel.responses.length > 0) {
      const metCount = intel.responses.filter(r => r.sla_met === true).length;
      const notMetCount = intel.responses.filter(r => r.sla_met === false).length;
      if (metCount > 0 || notMetCount > 0) {
        slaStatusElement = (
          <div style={{ fontSize: '10px', marginTop: '2px', display: 'flex', gap: '4px' }}>
            {metCount > 0 && <span style={{ color: 'var(--accent)' }}>{metCount} Met</span>}
            {notMetCount > 0 && <span style={{ color: 'var(--alert-color)' }}>{notMetCount} Missed</span>}
          </div>
        );
      }
    }
  }

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
    <React.Fragment>
      <tr 
        onClick={handleRowClick}
        style={{ 
          cursor: 'pointer', 
          borderBottom: '1px solid var(--border-color)',
          transition: 'background-color 0.2s'
        }}
      >
        {onToggleSelect && (
          <td style={{ padding: '10px' }} onClick={(e) => e.stopPropagation()}>
            <input 
              type="checkbox" 
              checked={selected || false} 
              onChange={(e) => onToggleSelect(intel.id, e.target.checked)} 
            />
          </td>
        )}
        <td style={{ padding: '10px', fontSize: '13px' }}>{intel.case_id}</td>
        <td style={{ padding: '10px', fontWeight: 'bold' }}>{intel.title}</td>
        <td style={{ padding: '10px' }}>
          <span className={`card-type-badge ${typeClass}`} style={{ fontSize: '11px', padding: '2px 6px' }}>
            {intel.type === 'Alert' ? '⚠' : '📋'} {intel.type}
          </span>
        </td>
        <td style={{ padding: '10px', fontSize: '13px' }}>
          <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-color)', fontSize: '11px' }}>
            {intel.category || 'General'}
          </span>
        </td>
        <td style={{ padding: '10px', fontSize: '13px' }}>{intel.target_org ? intel.target_org.name : 'All Members'}</td>
        <td style={{ padding: '10px' }}>
          <span className={`badge tlp ${tlpInfo.cls}`}>{tlpInfo.label}</span>
        </td>
        <td style={{ padding: '10px', fontSize: '13px', whiteSpace: 'nowrap' }}>
          {dueDateFormatted}
        </td>
        <td style={{ padding: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span 
              className="status-badge" 
              style={{ 
                fontSize: '11px', 
                padding: '3px 8px', 
                borderRadius: '12px', 
                backgroundColor: (displayStatus === 'DRAFT' && intel.classification === 'Shared Insights') ? 'rgba(168, 85, 247, 0.1)' : (displayStatus === 'DRAFT' ? 'transparent' : (displayStatus === 'UNACKNOWLEDGED' || displayStatus === 'OPEN' ? 'rgba(239, 68, 68, 0.1)' : (displayStatus === 'PENDING_REVIEW' ? 'rgba(168, 85, 247, 0.1)' : (displayStatus === 'APPROVED' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(34, 197, 94, 0.1)')))), 
                color: (displayStatus === 'DRAFT' && intel.classification === 'Shared Insights') ? '#a855f7' : (displayStatus === 'DRAFT' ? 'var(--text-dim)' : (displayStatus === 'UNACKNOWLEDGED' || displayStatus === 'OPEN' ? 'var(--alert-color)' : (displayStatus === 'PENDING_REVIEW' ? '#a855f7' : (displayStatus === 'APPROVED' ? '#3b82f6' : 'var(--accent)')))),
                border: (displayStatus === 'DRAFT' && intel.classification !== 'Shared Insights') ? '1px solid var(--border-color)' : 'none'
              }}>
              {displayStatus === 'PENDING_REVIEW' ? 'FOR ADMIN REVIEW' : ((displayStatus === 'DRAFT' && intel.classification === 'Shared Insights') ? 'FOR REVIEW' : (displayStatus === 'UNACKNOWLEDGED' && intel.type === 'Alert' ? 'UNRESPONDED' : displayStatus))}
            </span>
            {responseProgress && (
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                {responseProgress}
              </div>
            )}
            {clarificationsCount > 0 && (
              <div style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '4px', fontWeight: 'bold' }}>
                💬 {clarificationsCount} Clarification{clarificationsCount > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </td>
        <td style={{ padding: '10px' }}>
          {remarksInfo.label === '-' ? (
            <span style={{ color: 'var(--text-dim)', fontSize: '13px' }}>-</span>
          ) : (
            <span 
              className="status-badge"
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '12px',
                backgroundColor: remarksInfo.cls === 'remark-overdue' ? 'rgba(239, 68, 68, 0.15)' : (remarksInfo.cls === 'remark-met' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)'),
                color: remarksInfo.cls === 'remark-overdue' ? 'var(--alert-color, #ef4444)' : (remarksInfo.cls === 'remark-met' ? 'var(--accent, #22c55e)' : '#3b82f6'),
                border: remarksInfo.cls === 'remark-overdue' ? '1px solid rgba(239, 68, 68, 0.3)' : (remarksInfo.cls === 'remark-met' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)'),
                fontWeight: remarksInfo.cls === 'remark-overdue' ? 'bold' : 'normal',
                whiteSpace: 'nowrap'
              }}
            >
              {remarksInfo.label}
            </span>
          )}
        </td>
        <td style={{ padding: '10px' }}>
          {intel.tags && intel.tags.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {intel.tags.map((tag, i) => (
                <span 
                  key={i} 
                  className="tag" 
                  style={{ 
                    fontSize: '11px', 
                    padding: '2px 7px', 
                    borderRadius: '10px', 
                    backgroundColor: 'rgba(255, 255, 255, 0.08)', 
                    color: 'var(--text-color)',
                    border: '1px solid var(--border-color)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <span style={{ color: 'var(--text-dim)', fontSize: '13px' }}>-</span>
          )}
        </td>
        <td style={{ padding: '10px', fontSize: '13px' }}>{intel.classification}</td>
        <td style={{ padding: '10px', fontSize: '13px' }}>
          {intel.has_sla ? `${intel.sla_value} ${intel.sla_unit}${intel.sla_value > 1 ? 's' : ''}` : 'No'}
          {slaStatusElement}
        </td>
        <td style={{ padding: '10px', fontSize: '13px', color: 'var(--text-dim)' }}>
          {intel.published_at ? new Date(intel.published_at).toLocaleString() : '-'}
        </td>
      </tr>
    </React.Fragment>
  );
}

export default IntelRow;
