const fs = require('fs');

const files = [
  { name: 'src/components/IntelFeed.jsx', varName: 'intels' },
  { name: 'src/components/IncidentReportingDashboard.jsx', varName: 'incidents' },
  { name: 'src/components/IsacDashboard.jsx', varName: 'submissions' }
];

files.forEach(file => {
  let content = fs.readFileSync(file.name, 'utf8');
  
  // We want to dynamically extract unique values for the column if we can, but since the raw values are scattered, 
  // it's tricky to map the exact key to the object's properties.
  // Instead, since the user just wants the dropdown, we can provide a small helper function in the component to get unique values for the datalist.
  
  // We need to add list={`dl-${key}`} to the input. 
  // Wait, in the JSX, we have:
  // onChange={e => handleColumnFilter('case_id', e.target.value)}
  // We can capture the key 'case_id' from this string to use it!
  
  content = content.replace(/<input\s+placeholder="Filter\.\.\."\s+value=\{columnFilters\.([\w_]+) \|\| ''\}\s+onChange=\{e => handleColumnFilter\('([\w_]+)', e\.target\.value\)\}/g, 
    (match, key1, key2) => {
      return `<input 
                      list={\`dl-${key1}\`}
                      placeholder="Filter..." 
                      value={columnFilters.${key1} || ''} 
                      onChange={e => handleColumnFilter('${key1}', e.target.value)}`
    }
  );
  
  // Now we need to append the datalist below the input.
  // We can do this by matching the closing tag of the input, but it's self closing.
  // />
  // </th>
  
  content = content.replace(/onChange=\{e => handleColumnFilter\('([\w_]+)', e\.target\.value\)\}\s+style=\{\{width: '100%', fontSize: '11px', padding: '2px', boxSizing: 'border-box', background: 'rgba\(0,0,0,0\.2\)', border: '1px solid var\(--border-color\)', color: 'var\(--text-color\)', borderRadius: '4px'\}\}\s+\/>\s+<\/th>/g,
    (match, key) => {
      return `onChange={e => handleColumnFilter('${key}', e.target.value)} 
                      style={{width: '100%', fontSize: '11px', padding: '2px', boxSizing: 'border-box', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px'}} 
                    />
                    <datalist id={\`dl-${key}\`}>
                      {[...new Set((${file.varName} || []).map(item => {
                          if ('${key}' === 'case_id') return item.case_id;
                          if ('${key}' === 'title') return item.title;
                          if ('${key}' === 'type') return item.type;
                          if ('${key}' === 'category') return item.category;
                          if ('${key}' === 'target_org') return item.target_org?.name || 'All Members';
                          if ('${key}' === 'tlp') return item.tlp;
                          if ('${key}' === 'status') return item.my_status ? item.my_status.status : item.status;
                          if ('${key}' === 'classification') return item.classification;
                          if ('${key}' === 'state') return item.is_draft ? 'Draft' : (item.form_data?.reportType === 'Update to Previously Reported Incident' ? 'Updated' : 'Submitted');
                          if ('${key}' === 'org') return item.creator_org?.name;
                          return null;
                      }).filter(Boolean)))].map((val, idx) => (
                        <option key={idx} value={val} />
                      ))}
                    </datalist>
                  </th>`
    }
  );

  fs.writeFileSync(file.name, content);
});
