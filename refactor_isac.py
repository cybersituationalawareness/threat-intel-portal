import re

with open('frontend/src/components/IsacDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

right_panel_start = content.find('{/* Right Panel: Detail / Form */}')
right_panel_end = content.find('      {/* Share Insight Modal */}')

if right_panel_start != -1 and right_panel_end != -1:
    panel_content = content[right_panel_start:right_panel_end]

    # Extract discussion thread
    discussion_start = panel_content.find('{/* Discussion / Clarification Thread Section */}')
    discussion_end = panel_content.find('            </div>\n            \n          </div>\n        ) : (')
    
    discussion_thread = panel_content[discussion_start:discussion_end]

    # Replace right panel with Slide-Out Drawer
    drawer = f"""      {{/* Slide-Out Side Drawer */}}
      {{selectedSubmission && (
        <div className="side-drawer-overlay" onClick={{() => setSelectedSubmission(null)}}>
          <div className="side-drawer" onClick={{(e) => e.stopPropagation()}}>
            <div className="side-drawer-header">
              <div>
                <div style={{{{ fontSize: '18px', fontWeight: 'bold' }}}}>{{selectedSubmission.title || 'Untitled Insight'}}</div>
                <div style={{{{ fontSize: '13px', color: 'var(--text-dim)' }}}}>
                  {{selectedSubmission.case_id}} • {{selectedSubmission.submission_type}}
                  {{selectedSubmission.status === 'DRAFT' && (
                    <span style={{{{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.15)', color: 'var(--text-dim)', marginLeft: '8px' }}}}>
                      DRAFT
                    </span>
                  )}}
                </div>
              </div>
              <button onClick={{() => setSelectedSubmission(null)}} style={{{{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '20px', cursor: 'pointer' }}}}>✕</button>
            </div>
            <div className="side-drawer-content" style={{{{ padding: '20px' }}}}>
              
              <div style={{{{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}}}>
                <div>
                  {{selectedSubmission.confidence_level && (
                    <div style={{{{ fontSize: '12px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', display: 'inline-block' }}}}>
                      <strong>Confidence:</strong> {{selectedSubmission.confidence_level}}
                    </div>
                  )}}
                </div>

                <div style={{{{ display: 'flex', gap: '10px' }}}}>
                  {{currentUser.id === selectedSubmission.created_by_id && (
                    <button className="submit-btn" style={{{{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border-color)', fontSize: '12px' }}}} onClick={{handleEditClick}}>
                      Edit Insight
                    </button>
                  )}}
                  {{currentUser.organization.org_type === 'ACSAC' && (
                    <button 
                      className="submit-btn" 
                      style={{{{ 
                        background: selectedSubmission.is_escalated ? 'var(--bg-lighter)' : 'var(--alert-color)', 
                        color: selectedSubmission.is_escalated ? 'var(--text-dim)' : 'white', 
                        padding: '6px 12px',
                        fontSize: '12px',
                        cursor: selectedSubmission.is_escalated ? 'not-allowed' : 'pointer',
                        border: selectedSubmission.is_escalated ? '1px solid var(--border-color)' : 'none'
                      }}}} 
                      onClick={{handleEscalate}}
                      disabled={{selectedSubmission.is_escalated}}
                    >
                      {{selectedSubmission.is_escalated ? 'Escalated to Alert' : 'Escalate to Alert'}}
                    </button>
                  )}}
                </div>
              </div>

              <div style={{{{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}}}>
                Shared by <strong>{{selectedSubmission.organization?.name}}</strong> • Target: <strong>{{selectedSubmission.target_org ? (selectedSubmission.target_org.name === 'Platform' ? 'ACSAC' : selectedSubmission.target_org.name) : 'All Member'}}</strong> • Sighted on: {{new Date(selectedSubmission.sighting_datetime).toLocaleString()}}
              </div>

              <div style={{{{ marginBottom: '20px' }}}}>
                <h4 style={{{{ margin: '0 0 10px 0', color: 'var(--accent)' }}}}>Description</h4>
                <p style={{{{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '13px', lineHeight: '1.6' }}}}>
                  {{selectedSubmission.description}}
                </p>
              </div>

              {{selectedSubmission.indicators && (
                <div style={{{{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '20px' }}}}>
                  <h4 style={{{{ margin: '0 0 10px 0', color: 'var(--text-dim)' }}}}>Indicators (IOCs)</h4>
                  <pre style={{{{ margin: 0, fontSize: '12px', color: '#ff7b72', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}}}>{{selectedSubmission.indicators}}</pre>
                </div>
              )}}

              {discussion_thread}
            </div>
          </div>
        </div>
      )}}
      
      """

    new_content = content[:right_panel_start] + drawer + content[right_panel_end:]
    
    with open('frontend/src/components/IsacDashboard.jsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Success ISAC")
else:
    print("Failed to find boundaries in ISAC")
