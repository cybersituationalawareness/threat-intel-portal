import re

with open('frontend/src/components/AcsacDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('<div className="form-panel" style={{ overflowY: \'auto\' }}>')
end_idx = content.find('      {showIntelForm && (')

if start_idx != -1 and end_idx != -1:
    panel_content = content[start_idx:end_idx]
    
    # Extract inner content
    inner_start = panel_content.find('{selectedIntel.status === \'DRAFT\'')
    inner_end = panel_content.find('</>\n              )}')
    
    inner = panel_content[inner_start:inner_end+len('</>\n              )}')]
    
    drawer = f"""      {{/* Slide-Out Side Drawer */}}
      {{selectedIntel && (
        <div className="side-drawer-overlay" onClick={{() => setSelectedIntel(null)}}>
          <div className="side-drawer" onClick={{(e) => e.stopPropagation()}}>
            <div className="side-drawer-header">
              <div>
                <div style={{{{ fontSize: '18px', fontWeight: 'bold' }}}}>{{selectedIntel.title}}</div>
                <div style={{{{ fontSize: '13px', color: 'var(--text-dim)' }}}}>{{selectedIntel.case_id}} • {{selectedIntel.type}}</div>
              </div>
              <button onClick={{() => setSelectedIntel(null)}} style={{{{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '20px', cursor: 'pointer' }}}}>✕</button>
            </div>
            <div className="side-drawer-content" style={{{{ padding: '20px' }}}}>
              
              {{/* Intel Details */}}
              <div style={{{{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}}}>
                <h4 style={{{{ margin: '0 0 10px 0', color: 'var(--accent)' }}}}>Intel Details</h4>
                <div style={{{{ marginBottom: '10px', fontSize: '13px', whiteSpace: 'pre-wrap' }}}}>
                  <strong>Description:</strong><br/>{{selectedIntel.description}}
                </div>
                {{selectedIntel.threat_data && (
                  <div style={{{{ marginBottom: '10px', fontSize: '13px', whiteSpace: 'pre-wrap' }}}}>
                    <strong>Threat Data:</strong><br/>{{selectedIntel.threat_data}}
                  </div>
                )}}
                
                {{selectedIntel.attachments && selectedIntel.attachments.length > 0 && (
                  <div style={{{{ marginBottom: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}}}>
                    {{selectedIntel.attachments.map((att, idx) => (
                      <a key={{idx}} href="#" onClick={{(e) => {{
                        e.preventDefault();
                        const url = `/api/v1/intel/${{selectedIntel.id}}/attachment/${{encodeURIComponent(att.filename)}}`;
                        window.open(url, '_blank');
                      }}}} style={{{{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--accent)', textDecoration: 'none', fontSize: '13px', padding: '5px 10px', border: '1px solid var(--accent)', borderRadius: '4px' }}}}>
                        Download: {{att.filename}}
                      </a>
                    ))}}
                  </div>
                )}}

                <div style={{{{ display: 'flex', gap: '15px', marginTop: '15px', flexWrap: 'wrap' }}}}>
                  <div style={{{{ fontSize: '11px', color: 'var(--text-dim)' }}}}>
                    <strong>Creator:</strong> {{selectedIntel.creator_org?.name || 'Sector-Hub'}}
                  </div>
                  <div style={{{{ fontSize: '11px', color: 'var(--text-dim)' }}}}>
                    <strong>Confidence:</strong> {{selectedIntel.confidence}}
                  </div>
                  <div style={{{{ fontSize: '11px', color: 'var(--text-dim)' }}}}>
                    <strong>Category:</strong> {{selectedIntel.category || 'General'}}
                  </div>
                  <div style={{{{ fontSize: '11px', color: 'var(--text-dim)' }}}}>
                    <strong>Published:</strong> {{selectedIntel.published_at ? new Date(selectedIntel.published_at).toLocaleString() : '-'}}
                  </div>
                </div>
                {{selectedIntel.tags?.length > 0 && (
                  <div style={{{{ marginTop: '10px' }}}}>
                    {{selectedIntel.tags.map((tag, i) => (
                      <span key={{i}} className="tag" style={{{{ marginRight: '5px' }}}}>{{tag}}</span>
                    ))}}
                  </div>
                )}}
              </div>

              {{/* Member Status Matrix */}}
              <h4 style={{{{ margin: '0 0 10px 0', color: 'var(--accent)' }}}}>Member Status Matrix</h4>
              {inner}
            </div>
          </div>
        </div>
      )}}
"""

    new_content = content[:start_idx] + drawer + "\n" + content[end_idx:]
    with open('frontend/src/components/AcsacDashboard.jsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Success")
else:
    print("Failed to find boundaries")
