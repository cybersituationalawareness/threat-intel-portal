const fs = require('fs');
const file = 'frontend/src/components/AcsacDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const rightPanelStart = content.indexOf('<div className="form-panel" style={{ overflowY: \'auto\' }}>');
const rightPanelEnd = content.indexOf('</div>\n\n      {showIntelForm && (');

if (rightPanelStart !== -1 && rightPanelEnd !== -1) {
  const panelContent = content.substring(rightPanelStart, rightPanelEnd);

  // We want to replace `<div className="form-panel"...>` with our side drawer.
  let newDrawer = `
      {/* Slide-Out Side Drawer */}
      {selectedIntel && (
        <div className="side-drawer-overlay" onClick={() => setSelectedIntel(null)}>
          <div className="side-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="side-drawer-header">
              <div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{selectedIntel.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>{selectedIntel.case_id} • {selectedIntel.type}</div>
              </div>
              <button onClick={() => setSelectedIntel(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <div className="side-drawer-content" style={{ padding: '20px' }}>
              
              {/* Intel Details */}
              <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 10px 0', color: 'var(--accent)' }}>Intel Details</h4>
                <div style={{ marginBottom: '10px', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                  <strong>Description:</strong><br/>{selectedIntel.description}
                </div>
                {selectedIntel.threat_data && (
                  <div style={{ marginBottom: '10px', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                    <strong>Threat Data:</strong><br/>{selectedIntel.threat_data}
                  </div>
                )}
                
                {selectedIntel.attachments && selectedIntel.attachments.length > 0 && (
                  <div style={{ marginBottom: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {selectedIntel.attachments.map((att, idx) => (
                      <a key={idx} href="#" onClick={(e) => {
                        e.preventDefault();
                        // Minimal placeholder handler, ideally move handleDownload here or just use normal anchor if backend allows
                        const url = \`/api/v1/intel/\${selectedIntel.id}/attachment/\${encodeURIComponent(att.filename)}\`;
                        window.open(url, '_blank');
                      }} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--accent)', textDecoration: 'none', fontSize: '13px', padding: '5px 10px', border: '1px solid var(--accent)', borderRadius: '4px' }}>
                        Download: {att.filename}
                      </a>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '15px', marginTop: '15px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    <strong>Creator:</strong> {selectedIntel.creator_org?.name || 'Sector-Hub'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    <strong>Confidence:</strong> {selectedIntel.confidence}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    <strong>Category:</strong> {selectedIntel.category || 'General'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    <strong>Published:</strong> {selectedIntel.published_at ? new Date(selectedIntel.published_at).toLocaleString() : '-'}
                  </div>
                </div>
                {selectedIntel.tags?.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    {selectedIntel.tags.map((tag, i) => (
                      <span key={i} className="tag" style={{ marginRight: '5px' }}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Member Status Matrix */}
              <h4 style={{ margin: '0 0 10px 0', color: 'var(--accent)' }}>Member Status Matrix</h4>
`;

  const innerContentStart = panelContent.indexOf('{selectedIntel.status === \'DRAFT\'');
  if (innerContentStart !== -1) {
    const innerContent = panelContent.substring(innerContentStart, panelContent.lastIndexOf('</>\n        ) : ('));
    newDrawer += '              ' + innerContent + `\n            </div>\n          </div>\n        </div>\n      )}`;
    
    // Replace right panel entirely. Add a closing div because rightPanelEnd starts with '</div>' which we are eating?
    // Wait, the panel was closed by '</div>'. Our side drawer is just a modal. We don't need a wrapper form-panel div anymore.
    // BUT we need to make sure the end index is correct.
    const finalContent = content.substring(0, rightPanelStart) + newDrawer + '\n' + content.substring(rightPanelEnd + 6); 
    
    fs.writeFileSync(file, finalContent);
    console.log("Successfully refactored AcsacDashboard.jsx");
  } else {
    console.log("Could not find inner content of panel.");
  }

} else {
  console.log("Could not find right panel boundaries.");
}
