import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import Header from './components/Header';
import Login from './components/Login';
import AcsacDashboard from './components/AcsacDashboard';
import MemberDashboard from './components/MemberDashboard';
import IsacDashboard from './components/IsacDashboard';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import IncidentReportingDashboard from './components/IncidentReportingDashboard';
import AdminDashboard from './components/AdminDashboard';
import './index.css';

const API_BASE = process.env.REACT_APP_API_BASE || '';

function MainLayout() {
  const { currentUser } = useAuth();
  const isAcsac = currentUser?.organization?.org_type === 'ACSAC';
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('intel_id')) return 'alerts';
    if (params.has('incident_id')) return 'incidents';
    if (params.has('isac_id')) return 'isac';
    return isAcsac ? 'analytics' : 'alerts';
  });
  
  if (!currentUser) {
    return <Login />;
  }

  return (
    <div className="app-layout">
      <Header />
      <div className="tab-navigation" style={{ display: 'flex', gap: '20px', padding: '0 25px', backgroundColor: 'var(--bg-glass)', borderBottom: '1px solid var(--border-color)' }}>
        {isAcsac && (
          <button 
            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
            style={{ padding: '15px 0', background: 'transparent', border: 'none', borderBottom: activeTab === 'analytics' ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === 'analytics' ? 'var(--text-primary)' : 'var(--text-dim)', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Analytics
          </button>
        )}
        {currentUser?.role === 'ADMIN' && (
          <button 
            className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
            style={{ padding: '15px 0', background: 'transparent', border: 'none', borderBottom: activeTab === 'admin' ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === 'admin' ? 'var(--text-primary)' : 'var(--text-dim)', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Admin Administration
          </button>
        )}
        <button 
          className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
          style={{ padding: '15px 0', background: 'transparent', border: 'none', borderBottom: activeTab === 'alerts' ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === 'alerts' ? 'var(--text-primary)' : 'var(--text-dim)', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Alerts & Advisories
        </button>
        <button 
          className={`tab-btn ${activeTab === 'incidents' ? 'active' : ''}`}
          onClick={() => setActiveTab('incidents')}
          style={{ padding: '15px 0', background: 'transparent', border: 'none', borderBottom: activeTab === 'incidents' ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === 'incidents' ? 'var(--text-primary)' : 'var(--text-dim)', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Incident Reporting
        </button>
        <button 
          className={`tab-btn ${activeTab === 'isac' ? 'active' : ''}`}
          onClick={() => setActiveTab('isac')}
          style={{ padding: '15px 0', background: 'transparent', border: 'none', borderBottom: activeTab === 'isac' ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === 'isac' ? 'var(--text-primary)' : 'var(--text-dim)', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Insights Sharing
        </button>
      </div>
      
      {activeTab === 'analytics' && isAcsac ? (
        <AnalyticsDashboard />
      ) : activeTab === 'admin' && currentUser?.role === 'ADMIN' ? (
        <AdminDashboard />
      ) : activeTab === 'alerts' ? (
        isAcsac ? (
          <AcsacDashboard />
        ) : (
          <MemberDashboard />
        )
      ) : activeTab === 'incidents' ? (
        <IncidentReportingDashboard />
      ) : (
        <IsacDashboard />
      )}
      <div style={{ textAlign: 'center', padding: '15px', color: 'var(--text-dim)', fontSize: '12px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-glass)' }}>
        Created by <a href="https://www.linkedin.com/in/weicheng-alan-ong-cissp-cism-gmle-gcfa-gcih-gcti-73435298" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Ong Weicheng Alan</a>
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', background: 'white' }}>
          <h2>Something went wrong.</h2>
          <pre>{this.state.error.toString()}</pre>
          <pre>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider apiBase={API_BASE}>
        <MainLayout />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
