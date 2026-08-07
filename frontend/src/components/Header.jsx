import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';

function Header({ intelCount }) {
  const [time, setTime] = useState(new Date());
  const { currentUser, logout } = useAuth();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatUtc = (date) =>
    date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  return (
    <header className="header" role="banner">
      <div className="header-logo" aria-label="Cyber Situational Awareness logo">
        <div className="header-logo-icon" aria-hidden="true">⚡</div>
        <div className="header-logo-text" style={{ fontSize: '16px' }}>
          Cyber Situational Awareness <span style={{ display: 'block', fontSize: '12px', fontWeight: 'normal', color: 'var(--text-dim)' }}>Multi-Tenant Platform</span>
        </div>
      </div>

      <div className="header-divider" aria-hidden="true" />



      <div className="header-spacer" />

      {currentUser && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ fontSize: '11px', textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{currentUser.organization.name}</div>
            <div style={{ color: 'var(--text-dim)' }}>{currentUser.name} ({currentUser.role})</div>
          </div>
          <button 
            className="filter-btn" 
            onClick={logout}
          >
            Logout
          </button>
          <div className="header-divider" aria-hidden="true" />
        </div>
      )}

      {intelCount !== undefined && (
        <div className="header-status" role="status">
          <div className="status-dot" aria-hidden="true" />
          {intelCount} {intelCount === 1 ? 'entry' : 'entries'}
        </div>
      )}

      <time className="header-time" dateTime={time.toISOString()}>
        {formatUtc(time)}
      </time>
    </header>
  );
}

export default Header;
