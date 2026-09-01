import React, { useState, useEffect } from 'react';
import IntelRow from './IntelCard';
import Pagination from './Pagination';

/**
 * IntelFeed
 * ---------
 * Left panel: displays the live scrollable list of threat intelligence entries in a table.
 * Supports three filter modes via dropdown: All / Alert / Advisory.
 */
function IntelFeed({ intels, loading, filter, onFilterChange, onIntelSelect, selectedIds, onSelectionChange, onDeleteSelected, onEditSelected }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [columnFilters, setColumnFilters] = useState({});
  const handleColumnFilter = (key, value) => setColumnFilters(prev => ({...prev, [key]: value}));

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filter, columnFilters, intels]);

  const displayedIntels = intels.filter(intel => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const searchableText = [
      intel.title,
      intel.description,
      intel.threat_data,
      intel.case_id,
      intel.type,
      intel.classification,
      ...(intel.tags || [])
    ].filter(Boolean).join(' ').toLowerCase();
    return searchableText.includes(query);
  });

  const FILTERS = [
    { key: 'all',      label: 'All Types' },
    { key: 'Alert',    label: 'Alerts Only' },
    { key: 'Advisory', label: 'Advisories Only' },
  ];

  const totalPages = Math.ceil(displayedIntels.length / ITEMS_PER_PAGE);
  const paginatedIntels = displayedIntels.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <section className="feed-panel" aria-label="Active Intel Feed">
      {/* Panel header */}
      <div className="feed-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="feed-title-row">
          <h2 className="feed-title">Active Alert & Advisory</h2>
          <span className="feed-count" aria-label={`${intels.length} entries`}>
            {displayedIntels.length} {displayedIntels.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        <div className="feed-actions" style={{ flex: 'none', marginLeft: 'auto', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="Search alerts, content, fields..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="field-input"
            style={{ width: '250px', padding: '5px 10px', fontSize: '13px' }}
          />
          {(onEditSelected || onDeleteSelected) && (
            <select
              className="field-input"
              style={{ width: '120px', padding: '5px', fontSize: '13px' }}
              onChange={(e) => {
                if (e.target.value === 'delete' && onDeleteSelected) {
                  onDeleteSelected();
                  e.target.value = ''; // Reset
                } else if (e.target.value === 'edit' && onEditSelected) {
                  onEditSelected();
                  e.target.value = ''; // Reset
                }
              }}
            >
              <option value="">Actions...</option>
              <option value="edit" disabled={selectedIds?.size !== 1}>Edit Selected</option>
              <option value="delete" disabled={selectedIds?.size === 0}>Delete Selected</option>
            </select>
          )}
          
          <select 
            value={filter} 
            onChange={(e) => onFilterChange(e.target.value)}
            className="field-input"
            style={{ width: '150px', padding: '5px', fontSize: '13px' }}
          >
            {FILTERS.map(({ key, label }) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Feed list as a table */}
      <div className="feed-list" role="feed" aria-busy={loading} style={{ padding: '0' }}>
        {loading ? (
          <div className="feed-loading" aria-label="Loading intel entries">
            <div className="spinner" aria-hidden="true" />
            Loading intel feed...
          </div>
        ) : intels.length === 0 ? (
          <div className="feed-empty" role="status">
            <div className="feed-empty-icon" aria-hidden="true">📡</div>
            <div className="feed-empty-title">No Intelligence Entries</div>
            <div className="feed-empty-sub">
              Submit your first threat intel using the creation panel on the right.
            </div>
          </div>
        ) : (
          <table className="intel-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
                              <tr style={{ borderBottom: "none", backgroundColor: "var(--bg-glass)" }}>
                  <th style={{ padding: "4px 10px" }}></th>
                  <th style={{ padding: "4px 10px" }}>
                    <input 
                      list={`dl-case_id`}
                      placeholder="Filter..." 
                      value={columnFilters.case_id || ''} 
                      onChange={e => handleColumnFilter('case_id', e.target.value)} 
                      style={{width: '100%', fontSize: '11px', padding: '2px', boxSizing: 'border-box', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px'}} 
                    />
                    <datalist id={`dl-case_id`}>
                      {[...new Set((intels || []).map(item => {
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
                      list={`dl-title`}
                      placeholder="Filter..." 
                      value={columnFilters.title || ''} 
                      onChange={e => handleColumnFilter('title', e.target.value)} 
                      style={{width: '100%', fontSize: '11px', padding: '2px', boxSizing: 'border-box', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px'}} 
                    />
                    <datalist id={`dl-title`}>
                      {[...new Set((intels || []).map(item => {
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
                      list={`dl-type`}
                      placeholder="Filter..." 
                      value={columnFilters.type || ''} 
                      onChange={e => handleColumnFilter('type', e.target.value)} 
                      style={{width: '100%', fontSize: '11px', padding: '2px', boxSizing: 'border-box', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px'}} 
                    />
                    <datalist id={`dl-type`}>
                      {[...new Set((intels || []).map(item => {
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
                      list={`dl-category`}
                      placeholder="Filter..." 
                      value={columnFilters.category || ''} 
                      onChange={e => handleColumnFilter('category', e.target.value)} 
                      style={{width: '100%', fontSize: '11px', padding: '2px', boxSizing: 'border-box', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px'}} 
                    />
                    <datalist id={`dl-category`}>
                      {[...new Set((intels || []).map(item => {
                          if ('category' === 'case_id') return item.case_id;
                          if ('category' === 'title') return item.title;
                          if ('category' === 'type') return item.type;
                          if ('category' === 'category') return item.category;
                          if ('category' === 'target_org') return item.target_org?.name || 'All Members';
                          if ('category' === 'tlp') return item.tlp;
                          if ('category' === 'status') return item.my_status ? item.my_status.status : item.status;
                          if ('category' === 'classification') return item.classification;
                          if ('category' === 'state') return item.is_draft ? 'Draft' : (item.form_data?.reportType === 'Update to Previously Reported Incident' ? 'Updated' : 'Submitted');
                          if ('category' === 'org') return item.creator_org?.name;
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
                      {[...new Set((intels || []).map(item => {
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
                      {[...new Set((intels || []).map(item => {
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
                      list={`dl-due_date`}
                      placeholder="Filter..." 
                      value={columnFilters.due_date || ''} 
                      onChange={e => handleColumnFilter('due_date', e.target.value)} 
                      style={{width: '100%', fontSize: '11px', padding: '2px', boxSizing: 'border-box', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px'}} 
                    />
                    <datalist id={`dl-due_date`}>
                      {[...new Set((intels || []).map(item => {
                          if ('due_date' === 'case_id') return item.case_id;
                          if ('due_date' === 'title') return item.title;
                          if ('due_date' === 'type') return item.type;
                          if ('due_date' === 'category') return item.category;
                          if ('due_date' === 'target_org') return item.target_org?.name || 'All Members';
                          if ('due_date' === 'tlp') return item.tlp;
                          if ('due_date' === 'status') return item.my_status ? item.my_status.status : item.status;
                          if ('due_date' === 'classification') return item.classification;
                          if ('due_date' === 'state') return item.is_draft ? 'Draft' : (item.form_data?.reportType === 'Update to Previously Reported Incident' ? 'Updated' : 'Submitted');
                          if ('due_date' === 'org') return item.creator_org?.name;
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
                      {[...new Set((intels || []).map(item => {
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
                      list={`dl-remarks`}
                      placeholder="Filter..." 
                      value={columnFilters.remarks || ''} 
                      onChange={e => handleColumnFilter('remarks', e.target.value)} 
                      style={{width: '100%', fontSize: '11px', padding: '2px', boxSizing: 'border-box', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px'}} 
                    />
                    <datalist id={`dl-remarks`}>
                      {[...new Set((intels || []).map(item => {
                          if ('remarks' === 'case_id') return item.case_id;
                          if ('remarks' === 'title') return item.title;
                          if ('remarks' === 'type') return item.type;
                          if ('remarks' === 'category') return item.category;
                          if ('remarks' === 'target_org') return item.target_org?.name || 'All Members';
                          if ('remarks' === 'tlp') return item.tlp;
                          if ('remarks' === 'status') return item.my_status ? item.my_status.status : item.status;
                          if ('remarks' === 'classification') return item.classification;
                          if ('remarks' === 'state') return item.is_draft ? 'Draft' : (item.form_data?.reportType === 'Update to Previously Reported Incident' ? 'Updated' : 'Submitted');
                          if ('remarks' === 'org') return item.creator_org?.name;
                          return null;
                      }).filter(Boolean))].map((val, idx) => (
                        <option key={idx} value={val} />
                      ))}
                    </datalist>
                  </th>
                  <th style={{ padding: "4px 10px" }}>
                    <input 
                      list={`dl-tags`}
                      placeholder="Filter..." 
                      value={columnFilters.tags || ''} 
                      onChange={e => handleColumnFilter('tags', e.target.value)} 
                      style={{width: '100%', fontSize: '11px', padding: '2px', boxSizing: 'border-box', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px'}} 
                    />
                    <datalist id={`dl-tags`}>
                      {[...new Set((intels || []).map(item => {
                          if ('tags' === 'case_id') return item.case_id;
                          if ('tags' === 'title') return item.title;
                          if ('tags' === 'type') return item.type;
                          if ('tags' === 'category') return item.category;
                          if ('tags' === 'target_org') return item.target_org?.name || 'All Members';
                          if ('tags' === 'tlp') return item.tlp;
                          if ('tags' === 'status') return item.my_status ? item.my_status.status : item.status;
                          if ('tags' === 'classification') return item.classification;
                          if ('tags' === 'state') return item.is_draft ? 'Draft' : (item.form_data?.reportType === 'Update to Previously Reported Incident' ? 'Updated' : 'Submitted');
                          if ('tags' === 'org') return item.creator_org?.name;
                          return null;
                      }).filter(Boolean))].map((val, idx) => (
                        <option key={idx} value={val} />
                      ))}
                    </datalist>
                  </th>
                  <th style={{ padding: "4px 10px" }}>
                    <input 
                      list={`dl-classification`}
                      placeholder="Filter..." 
                      value={columnFilters.classification || ''} 
                      onChange={e => handleColumnFilter('classification', e.target.value)} 
                      style={{width: '100%', fontSize: '11px', padding: '2px', boxSizing: 'border-box', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px'}} 
                    />
                    <datalist id={`dl-classification`}>
                      {[...new Set((intels || []).map(item => {
                          if ('classification' === 'case_id') return item.case_id;
                          if ('classification' === 'title') return item.title;
                          if ('classification' === 'type') return item.type;
                          if ('classification' === 'category') return item.category;
                          if ('classification' === 'target_org') return item.target_org?.name || 'All Members';
                          if ('classification' === 'tlp') return item.tlp;
                          if ('classification' === 'status') return item.my_status ? item.my_status.status : item.status;
                          if ('classification' === 'classification') return item.classification;
                          if ('classification' === 'state') return item.is_draft ? 'Draft' : (item.form_data?.reportType === 'Update to Previously Reported Incident' ? 'Updated' : 'Submitted');
                          if ('classification' === 'org') return item.creator_org?.name;
                          return null;
                      }).filter(Boolean))].map((val, idx) => (
                        <option key={idx} value={val} />
                      ))}
                    </datalist>
                  </th>
                  <th style={{ padding: "4px 10px" }}>
                    <input 
                      list={`dl-sla`}
                      placeholder="Filter..." 
                      value={columnFilters.sla || ''} 
                      onChange={e => handleColumnFilter('sla', e.target.value)} 
                      style={{width: '100%', fontSize: '11px', padding: '2px', boxSizing: 'border-box', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px'}} 
                    />
                    <datalist id={`dl-sla`}>
                      {[...new Set((intels || []).map(item => {
                          if ('sla' === 'case_id') return item.case_id;
                          if ('sla' === 'title') return item.title;
                          if ('sla' === 'type') return item.type;
                          if ('sla' === 'category') return item.category;
                          if ('sla' === 'target_org') return item.target_org?.name || 'All Members';
                          if ('sla' === 'tlp') return item.tlp;
                          if ('sla' === 'status') return item.my_status ? item.my_status.status : item.status;
                          if ('sla' === 'classification') return item.classification;
                          if ('sla' === 'state') return item.is_draft ? 'Draft' : (item.form_data?.reportType === 'Update to Previously Reported Incident' ? 'Updated' : 'Submitted');
                          if ('sla' === 'org') return item.creator_org?.name;
                          return null;
                      }).filter(Boolean))].map((val, idx) => (
                        <option key={idx} value={val} />
                      ))}
                    </datalist>
                  </th>
                  <th style={{ padding: "4px 10px" }}>
                    <input 
                      list={`dl-published`}
                      placeholder="Filter..." 
                      value={columnFilters.published || ''} 
                      onChange={e => handleColumnFilter('published', e.target.value)} 
                      style={{width: '100%', fontSize: '11px', padding: '2px', boxSizing: 'border-box', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px'}} 
                    />
                    <datalist id={`dl-published`}>
                      {[...new Set((intels || []).map(item => {
                          if ('published' === 'case_id') return item.case_id;
                          if ('published' === 'title') return item.title;
                          if ('published' === 'type') return item.type;
                          if ('published' === 'category') return item.category;
                          if ('published' === 'target_org') return item.target_org?.name || 'All Members';
                          if ('published' === 'tlp') return item.tlp;
                          if ('published' === 'status') return item.my_status ? item.my_status.status : item.status;
                          if ('published' === 'classification') return item.classification;
                          if ('published' === 'state') return item.is_draft ? 'Draft' : (item.form_data?.reportType === 'Update to Previously Reported Incident' ? 'Updated' : 'Submitted');
                          if ('published' === 'org') return item.creator_org?.name;
                          return null;
                      }).filter(Boolean))].map((val, idx) => (
                        <option key={idx} value={val} />
                      ))}
                    </datalist>
                  </th>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-glass)' }}>
                {onSelectionChange && (
                  <th style={{ padding: '10px', width: '40px' }}>
                    <input 
                      type="checkbox" 
                      onChange={(e) => {
                        if (e.target.checked) {
                          onSelectionChange(new Set(intels.map(i => i.id)));
                        } else {
                          onSelectionChange(new Set());
                        }
                      }}
                      checked={intels.length > 0 && selectedIds?.size === intels.length}
                    />
                  </th>
                )}
                <th style={{ padding: '10px' }}>A&A ID</th>
                <th style={{ padding: '10px' }}>Title</th>
                <th style={{ padding: '10px' }}>Type</th>
                <th style={{ padding: '10px' }}>Category</th>
                <th style={{ padding: '10px' }}>Target Member</th>
                <th style={{ padding: '10px' }}>TLP</th>
                <th style={{ padding: '10px' }}>Target Due Date</th>
                <th style={{ padding: '10px' }}>Status</th>
                <th style={{ padding: '10px' }}>Remarks</th>
                <th style={{ padding: '10px' }}>Tagged</th>
                <th style={{ padding: '10px' }}>Source</th>
                <th style={{ padding: '10px' }}>SLA</th>
                <th style={{ padding: '10px' }}>Published</th>
              </tr>
            </thead>
            <tbody>
              {paginatedIntels.map((intel) => (
                <IntelRow 
                  key={intel.id} 
                  intel={intel} 
                  onSelect={() => onIntelSelect && onIntelSelect(intel)}
                  selected={selectedIds?.has(intel.id)}
                  onToggleSelect={onSelectionChange ? (id, checked) => {
                    const next = new Set(selectedIds);
                    if (checked) next.add(id);
                    else next.delete(id);
                    onSelectionChange(next);
                  } : undefined}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
      {!loading && displayedIntels.length > 0 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      )}
    </section>
  );
}

export default IntelFeed;
