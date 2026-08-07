const fs = require('fs');
const css = `
/* Side Drawer Styles */
.side-drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
  animation: fadeIn 0.2s ease-in-out;
}

.side-drawer {
  width: 45%;
  min-width: 400px;
  max-width: 800px;
  background: var(--bg-surface);
  height: 100%;
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  animation: slideInRight 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  border-left: 1px solid var(--border-color);
}

.side-drawer-header {
  padding: 20px 25px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-panel);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.side-drawer-content {
  flex: 1;
  overflow-y: auto;
}

@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
`;
fs.appendFileSync('frontend/src/index.css', css);
