const fs = require('fs');

// Helper to wrap inputs
function getInputsRow(cols, hasCheckbox) {
  let res = '                <tr style={{ borderBottom: "none", backgroundColor: "var(--bg-glass)" }}>\n';
  if (hasCheckbox) {
    res += '                  <th style={{ padding: "4px 10px" }}></th>\n';
  }
  cols.forEach(col => {
    res += `                  <th style={{ padding: "4px 10px" }}>
                    <input 
                      placeholder="Filter..." 
                      value={columnFilters.${col.key} || ''} 
                      onChange={e => handleColumnFilter('${col.key}', e.target.value)} 
                      style={{width: '100%', fontSize: '11px', padding: '2px', boxSizing: 'border-box', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px'}} 
                    />
                  </th>\n`;
  });
  res += '                </tr>\n';
  return res;
}

// 1. IntelFeed.jsx
let content = fs.readFileSync('src/components/IntelFeed.jsx', 'utf8');
if (!content.includes('columnFilters')) {
  // Add state
  content = content.replace(
    "const [searchQuery, setSearchQuery] = useState('');",
    "const [searchQuery, setSearchQuery] = useState('');\n  const [columnFilters, setColumnFilters] = useState({});\n  const handleColumnFilter = (key, value) => setColumnFilters(prev => ({...prev, [key]: value}));"
  );
  
  // Update logic
  let logic = `
    for (const [key, value] of Object.entries(columnFilters)) {
      if (!value) continue;
      const filterVal = value.toLowerCase();
      let fieldVal = '';
      if (key === 'case_id') fieldVal = intel.case_id;
      else if (key === 'title') fieldVal = intel.title;
      else if (key === 'type') fieldVal = intel.type;
      else if (key === 'category') fieldVal = intel.category;
      else if (key === 'target_org') fieldVal = intel.target_org?.name || 'All Members';
      else if (key === 'tlp') fieldVal = intel.tlp;
      else if (key === 'status') fieldVal = intel.my_status ? intel.my_status.status : intel.status;
      else if (key === 'tags') fieldVal = (intel.tags || []).join(' ');
      else if (key === 'classification') fieldVal = intel.classification;
      else if (key === 'published') fieldVal = intel.published_at;
      
      if (typeof fieldVal === 'string' && !fieldVal.toLowerCase().includes(filterVal)) {
        return false;
      }
    }
    return true;
  });`;
  content = content.replace('return searchableText.includes(query);\n  });', 'if (!searchableText.includes(query)) return false;\n    }\n' + logic);
  
  // Add inputs row
  let cols = [
    {key: 'case_id'}, {key: 'title'}, {key: 'type'}, {key: 'category'}, {key: 'target_org'},
    {key: 'tlp'}, {key: 'due_date'}, {key: 'status'}, {key: 'remarks'}, {key: 'tags'},
    {key: 'classification'}, {key: 'sla'}, {key: 'published'}
  ];
  let inputsRow = getInputsRow(cols, true);
  
  content = content.replace('<tr style={{ borderBottom: \'1px solid var(--border-color)\', backgroundColor: \'var(--bg-glass)\' }}>', inputsRow + '                <tr style={{ borderBottom: \'1px solid var(--border-color)\', backgroundColor: \'var(--bg-glass)\' }}>');
  
  fs.writeFileSync('src/components/IntelFeed.jsx', content);
}


// 2. IncidentReportingDashboard.jsx
let irContent = fs.readFileSync('src/components/IncidentReportingDashboard.jsx', 'utf8');
if (!irContent.includes('columnFilters')) {
  irContent = irContent.replace(
    "const [selectedIncident, setSelectedIncident] = useState(null);",
    "const [selectedIncident, setSelectedIncident] = useState(null);\n  const [columnFilters, setColumnFilters] = useState({});\n  const handleColumnFilter = (key, value) => setColumnFilters(prev => ({...prev, [key]: value}));"
  );
  
  let logic = `
    for (const [key, value] of Object.entries(columnFilters)) {
      if (!value) continue;
      const filterVal = value.toLowerCase();
      let fieldVal = '';
      if (key === 'case_id') fieldVal = inc.case_id;
      else if (key === 'state') fieldVal = inc.is_draft ? 'Draft' : (inc.form_data?.reportType === 'Update to Previously Reported Incident' ? 'Updated' : 'Submitted');
      else if (key === 'status') fieldVal = inc.status;
      else if (key === 'title') fieldVal = inc.title;
      else if (key === 'date') fieldVal = inc.incident_date;
      else if (key === 'org') fieldVal = inc.creator_org?.name;
      
      if (typeof fieldVal === 'string' && !fieldVal.toLowerCase().includes(filterVal)) {
        return false;
      }
    }
    return true;
  });`;
  irContent = irContent.replace('return searchableText.includes(query);\n  });', 'if (!searchableText.includes(query)) return false;\n    }\n' + logic);
  
  let cols = [
    {key: 'case_id'}, {key: 'state'}, {key: 'status'}, {key: 'title'}, {key: 'date'}, {key: 'org'}
  ];
  let inputsRow = getInputsRow(cols, false);
  
  irContent = irContent.replace('<tr style={{ borderBottom: \'1px solid var(--border-color)\', backgroundColor: \'var(--bg-glass)\' }}>', inputsRow + '                <tr style={{ borderBottom: \'1px solid var(--border-color)\', backgroundColor: \'var(--bg-glass)\' }}>');
  
  fs.writeFileSync('src/components/IncidentReportingDashboard.jsx', irContent);
}


// 3. IsacDashboard.jsx
let isacContent = fs.readFileSync('src/components/IsacDashboard.jsx', 'utf8');
if (!isacContent.includes('columnFilters')) {
  isacContent = isacContent.replace(
    "const [selectedSubmission, setSelectedSubmission] = useState(null);",
    "const [selectedSubmission, setSelectedSubmission] = useState(null);\n  const [columnFilters, setColumnFilters] = useState({});\n  const handleColumnFilter = (key, value) => setColumnFilters(prev => ({...prev, [key]: value}));"
  );
  
  let logic = `
    for (const [key, value] of Object.entries(columnFilters)) {
      if (!value) continue;
      const filterVal = value.toLowerCase();
      let fieldVal = '';
      if (key === 'case_id') fieldVal = sub.case_id;
      else if (key === 'type') fieldVal = sub.type;
      else if (key === 'title') fieldVal = sub.title;
      else if (key === 'target_org') fieldVal = sub.target_org?.name || 'All Members';
      else if (key === 'tlp') fieldVal = sub.tlp;
      else if (key === 'status') fieldVal = sub.status;
      else if (key === 'date') fieldVal = sub.sighting_datetime;
      else if (key === 'org') fieldVal = sub.creator_org?.name;
      
      if (typeof fieldVal === 'string' && !fieldVal.toLowerCase().includes(filterVal)) {
        return false;
      }
    }
    return true;
  });`;
  isacContent = isacContent.replace('return searchableText.includes(query);\n  });', 'if (!searchableText.includes(query)) return false;\n    }\n' + logic);
  
  let cols = [
    {key: 'case_id'}, {key: 'type'}, {key: 'title'}, {key: 'target_org'}, {key: 'tlp'}, {key: 'status'}, {key: 'date'}, {key: 'org'}
  ];
  let inputsRow = getInputsRow(cols, false);
  
  isacContent = isacContent.replace('<tr style={{ borderBottom: \'1px solid var(--border-color)\', backgroundColor: \'var(--bg-glass)\' }}>', inputsRow + '                <tr style={{ borderBottom: \'1px solid var(--border-color)\', backgroundColor: \'var(--bg-glass)\' }}>');
  
  fs.writeFileSync('src/components/IsacDashboard.jsx', isacContent);
}
