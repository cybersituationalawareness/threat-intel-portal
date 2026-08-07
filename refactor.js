const fs = require('fs');
const file = 'frontend/src/components/IsacDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const rightPanelStart = content.indexOf('{showForm ? (');
const selectedSubStart = content.indexOf(') : selectedSubmission ? (');

if (rightPanelStart !== -1 && selectedSubStart !== -1) {
  const formBlock = content.substring(rightPanelStart + '{showForm ? ('.length, selectedSubStart);
  
  content = content.substring(0, rightPanelStart) + '{selectedSubmission ? (' + content.substring(selectedSubStart + ') : selectedSubmission ? ('.length);
  
  const modalBlock = `
      {/* Share Insight Modal */}
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-base)', width: '90%', maxWidth: '900px', maxHeight: '90vh', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)', overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '20px 30px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-panel)' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>{isEditing ? 'Edit Insight' : 'Share Insight'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '30px' }}>
              ` + formBlock.replace('<h2>{isEditing ? \'Edit Insight\' : \'Share Insight\'}</h2>', '') + `
            </div>
          </div>
        </div>
      )}`;

  const lastDivIndex = content.lastIndexOf('</div>\n      \n    </div>');
  if (lastDivIndex !== -1) {
    content = content.substring(0, lastDivIndex) + modalBlock + '\n    ' + content.substring(lastDivIndex);
    fs.writeFileSync(file, content);
    console.log('Successfully refactored IsacDashboard.jsx');
  } else {
    console.log('Could not find insertion point for modal.');
  }
} else {
  console.log('Could not find form block in right panel.');
}
