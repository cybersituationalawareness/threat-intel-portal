import re

with open('frontend/src/components/IncidentReportingDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

right_panel_start = content.find('{/* Right Panel: Detail View */}')
right_panel_end = content.find('<IncidentReportingModal')

if right_panel_start != -1 and right_panel_end != -1:
    panel_content = content[right_panel_start:right_panel_end]

    # Replace right panel with Slide-Out Drawer
    drawer = f"""      {{/* Slide-Out Side Drawer */}}
      {{selectedIncident && (
        <div className="side-drawer-overlay" onClick={{() => setSelectedIncident(null)}}>
          <div className="side-drawer" onClick={{(e) => e.stopPropagation()}}>
            <div className="side-drawer-header">
              <div>
                <div style={{{{ fontSize: '18px', fontWeight: 'bold' }}}}>{{selectedIncident.title || 'Untitled Incident'}}</div>
                <div style={{{{ fontSize: '13px', color: 'var(--text-dim)' }}}}>{{selectedIncident.case_id}} {{selectedIncident.is_draft ? '(Draft)' : ''}}</div>
              </div>
              <button onClick={{() => setSelectedIncident(null)}} style={{{{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '20px', cursor: 'pointer' }}}}>✕</button>
            </div>
            <div className="side-drawer-content" style={{{{ padding: '20px' }}}}>
              
              <div style={{{{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}}}>
                <div style={{{{ display: 'flex', alignItems: 'center', gap: '10px' }}}}>
                  <strong style={{{{ fontSize: '13px', color: 'var(--accent)' }}}}>Status:</strong>
                  {{currentUser?.organization?.org_type === 'ACSAC' ? (
                    <select
                      value={{selectedIncident.status}}
                      onChange={{(e) => handleStatusChange(selectedIncident.id, e.target.value)}}
                      style={{{{ background: 'var(--bg-panel)', color: 'var(--text-color)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '4px 8px', fontSize: '12px' }}}}
                    >
                      <option value="Open">Open</option>
                      <option value="Investigating">Investigating</option>
                      <option value="Closed">Closed</option>
                    </select>
                  ) : (
                    <span style={{{{ fontSize: '13px' }}}}>{{selectedIncident.status}}</span>
                  )}}
                </div>

                <div style={{{{ display: 'flex', gap: '10px' }}}}>
                  {{currentUser?.organization?.org_type === 'ACSAC' ? (
                    <button className="submit-btn" style={{{{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', fontSize: '12px' }}}} onClick={{handleViewIncident}}>
                      View Form Data
                    </button>
                  ) : (
                    <button className="submit-btn" style={{{{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', fontSize: '12px' }}}} onClick={{handleEditIncident}}>
                      Edit Incident
                    </button>
                  )}}
                </div>
              </div>

              <div style={{{{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}}}>
                Reported by <strong>{{selectedIncident.organization?.name}}</strong> • Occurred on: {{new Date(selectedIncident.incident_date).toLocaleString()}}
              </div>

              <div style={{{{ marginBottom: '20px' }}}}>
                <h4 style={{{{ margin: '0 0 10px 0', color: 'var(--accent)' }}}}>Description</h4>
                <p style={{{{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '13px', lineHeight: '1.6' }}}}>
                  {{selectedIncident.description === 'See form data' ? 'Refer to the full form data for details.' : selectedIncident.description}}
                </p>
              </div>
              
              {{selectedIncident.attachments && selectedIncident.attachments.length > 0 && (
                <div>
                  <h4 style={{{{ margin: '0 0 10px 0', color: 'var(--accent)' }}}}>Attachments</h4>
                  <div style={{{{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}}}>
                    {{selectedIncident.attachments.map((att, idx) => (
                      <a key={{idx}} href={{`/api/v1/incidents/${{selectedIncident.id}}/attachment/${{att.filename}}`}} target="_blank" rel="noreferrer" style={{{{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--accent)', textDecoration: 'none', fontSize: '12px' }}}}>
                        📄 {{att.filename}}
                      </a>
                    ))}}
                  </div>
                </div>
              )}}
            </div>
          </div>
        </div>
      )}}
      
      """

    new_content = content[:right_panel_start] + drawer + content[right_panel_end:]
    
    with open('frontend/src/components/IncidentReportingDashboard.jsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Success Incident Reporting")
else:
    print("Failed to find boundaries in Incident Reporting")
