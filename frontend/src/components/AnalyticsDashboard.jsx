import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import {
  PieChart, Pie, Cell,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const AnalyticsDashboard = () => {
  const { authFetch, currentUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        // Assuming we pass some auth token if needed, or just regular fetch if cookies are used.
        // Let's use the standard fetch pattern seen in the app
        const response = await authFetch('/api/v1/analytics/dashboard');
        
        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }
        
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [authFetch]);

  if (loading) {
    return (
      <div className="dashboard-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div className="spinner" style={{ border: '4px solid rgba(255,255,255,0.1)', borderLeftColor: 'var(--accent)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container" style={{ padding: '20px', color: 'var(--error-text)' }}>
        <h3>Error loading analytics</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip" style={{
          backgroundColor: 'var(--bg-glass)',
          border: '1px solid var(--border-color)',
          padding: '10px 15px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          color: 'var(--text-primary)'
        }}>
          <p className="label" style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{label || payload[0].name}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: 0, color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderDonutChart = (chartData, title) => (
    <div className="chart-card" style={{
      flex: '1 1 300px',
      backgroundColor: 'var(--bg-glass)',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid var(--border-color)',
      boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <h3 style={{ color: 'var(--text-primary)', marginBottom: '20px', fontSize: '1.1rem', textAlign: 'center' }}>{title}</h3>
      {chartData && chartData.length > 0 ? (
        <div style={{ width: '100%', height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '20px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
          No data available
        </div>
      )}
    </div>
  );

  return (
    <div className="dashboard-container" style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto', flex: 1, overflowY: 'auto', width: '100%' }}>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '2rem', margin: '0 0 10px 0', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Analytics Overview</h2>
        <p style={{ color: 'var(--text-dim)', margin: 0 }}>Comprehensive statistics of threats and platform engagement.</p>
      </div>

      <div className="charts-grid" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '24px',
        marginBottom: '24px'
      }}>
        {renderDonutChart(data.intelTypeDistribution, "Intel Type Distribution")}
        {renderDonutChart(data.slaCompliance, "SLA Compliance")}
      </div>

      <div className="chart-card line-chart" style={{
        backgroundColor: 'var(--bg-glass)',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
        marginBottom: '24px',
        width: '100%'
      }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '20px', fontSize: '1.1rem' }}>Intel Volume Over Time</h3>
        {data.volumeOverTime && data.volumeOverTime.length > 0 ? (
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.volumeOverTime} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-dim)" tick={{fill: 'var(--text-dim)'}} tickMargin={10} />
                <YAxis stroke="var(--text-dim)" tick={{fill: 'var(--text-dim)'}} tickMargin={10} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="count" name="Publications" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2 }} activeDot={{ r: 6 }} label={{ position: 'top', fill: 'var(--text-dim)', fontSize: 12, dy: -10 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
            No data available
          </div>
        )}
      </div>

      <div className="charts-grid" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '24px'
      }}>
        {renderDonutChart(data.alertStatusDistribution, "Alerts by Status")}
        {renderDonutChart(data.advisoryStatusDistribution, "Advisories by Status")}
      </div>
      
    </div>
  );
};

export default AnalyticsDashboard;
