import React, { useState } from 'react';
import { useAuth } from '../AuthContext';

const API_BASE = process.env.REACT_APP_API_BASE || '';

function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (res.ok) {
        const user = await res.json();
        login(user);
      } else {
        const data = await res.json();
        setError(data.detail || 'Invalid credentials');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="feed-empty" style={{ height: '100vh', justifyContent: 'center' }}>
      <div className="header-logo" style={{ marginBottom: '30px', transform: 'scale(1.5)', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div className="header-logo-icon">⚡</div>
        <div className="header-logo-text" style={{ fontSize: '18px', marginTop: '10px' }}>Cyber Situational Awareness<br/><span>Multi-Tenant Platform</span></div>
      </div>
      
      <div className="feed-empty-title" style={{ marginBottom: '20px' }}>
        Log in to your account
      </div>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '300px' }}>
        {error && <div style={{ color: '#ff4d4d', fontSize: '13px', textAlign: 'center', background: 'rgba(255, 77, 77, 0.1)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(255, 77, 77, 0.3)' }}>{error}</div>}
        
        <div>
          <label className="field-label" style={{ textAlign: 'left', display: 'block', marginBottom: '5px' }}>Email</label>
          <input 
            type="email" 
            className="field-input" 
            placeholder="e.g. admin@platform.local" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%' }}
          />
        </div>
        
        <div>
          <label className="field-label" style={{ textAlign: 'left', display: 'block', marginBottom: '5px' }}>Password</label>
          <input 
            type="password" 
            className="field-input" 
            placeholder="Enter your password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%' }}
          />
        </div>

        <button type="submit" className="submit-btn" disabled={loading} style={{ marginTop: '10px' }}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
    </div>
  );
}

export default Login;
