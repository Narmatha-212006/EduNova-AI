import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { reportsAPI, submissionsAPI } from '../../services/api';
import GlassCard from '../../components/GlassCard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';

// ── Custom Tooltip for Bar Chart (light-theme friendly) ──────────────────
const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: '#ffffff', border: '1px solid #e5e7eb',
      borderRadius: '10px', padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(79,70,229,0.12)', fontSize: '12.5px'
    }}>
      <p style={{ fontWeight: 700, color: '#1e1b4b', marginBottom: '4px' }}>{label}</p>
      <p style={{ color: '#4f46e5' }}>Avg Score: <strong>{payload[0].value}</strong></p>
      {d.total_marks && <p style={{ color: '#6b7280' }}>Out of: {d.total_marks}</p>}
      {d.submission_count !== undefined && <p style={{ color: '#6b7280' }}>Submissions: {d.submission_count}</p>}
      {d.evaluated_count !== undefined && <p style={{ color: '#10b981' }}>Evaluated: {d.evaluated_count}</p>}
    </div>
  );
};

// ── Custom Tooltip for Pie Chart ──────────────────────────────────────────
const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: '#ffffff', border: '1px solid #e5e7eb',
      borderRadius: '10px', padding: '8px 12px',
      boxShadow: '0 8px 24px rgba(79,70,229,0.12)', fontSize: '12.5px'
    }}>
      <p style={{ fontWeight: 700, color: '#1e1b4b' }}>{payload[0].name}</p>
      <p style={{ color: '#4f46e5' }}>Count: <strong>{payload[0].value}</strong></p>
    </div>
  );
};

// ── Bar chart X-axis label truncation ────────────────────────────────────
const truncate = (str, n = 14) => str && str.length > n ? str.slice(0, n) + '…' : str;

// ── Spinner component ─────────────────────────────────────────────────────
const Spinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
    <div className="dash-spinner" />
    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontFamily: 'var(--font-display)' }}>
      Loading dashboard analytics…
    </p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const firstName = user?.name ? user.name.split(' ')[0] : 'Faculty';

  // ── State ─────────────────────────────────────────────────────────────────
  const [analytics, setAnalytics] = useState(null);         // full API response
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef(null);

  // ── Fetch data ────────────────────────────────────────────────────────────
  const fetchDashboardData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);

      const [analyticsRes, subsRes] = await Promise.all([
        reportsAPI.getTeacherDashboardAnalytics(),
        submissionsAPI.listTeacherSubmissions(),
      ]);

      setAnalytics(analyticsRes.data);
      setRecentSubmissions(subsRes.data.slice(0, 6));
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Dashboard fetch failed:', err);
      setError(
        err?.response?.data?.detail ||
        'Failed to load dashboard analytics. Make sure the backend is running.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── Mount + Auto-refresh every 30s ───────────────────────────────────────
  useEffect(() => {
    fetchDashboardData(false);

    // Auto-refresh on window focus (e.g., teacher publishes then switches back)
    const onFocus = () => fetchDashboardData(true);
    window.addEventListener('focus', onFocus);

    // Listen for publish/evaluate events dispatched from other pages
    const onDashRefresh = () => fetchDashboardData(true);
    window.addEventListener('dashboardRefresh', onDashRefresh);

    // Polling every 30 seconds
    timerRef.current = setInterval(() => fetchDashboardData(true), 30000);

    return () => {
      clearInterval(timerRef.current);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('dashboardRefresh', onDashRefresh);
    };
  }, [fetchDashboardData]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const stats = analytics || {
    total_assignments: 0,
    total_students: 0,
    pending_reviews: 0,
    pending_approval: 0,
    published_results: 0,
    assignment_averages: [],
    evaluation_status_mix: [],
  };

  // Only show assignments in bar chart that have at least one evaluation
  const barData = (stats.assignment_averages || []).filter(a => a.evaluated_count > 0);
  const allBarData = stats.assignment_averages || [];   // for "no data" logic
  const pieData = stats.evaluation_status_mix || [];

  const timeGreet = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Morning';
    if (h < 17) return 'Afternoon';
    return 'Evening';
  };

  // ── Render states ─────────────────────────────────────────────────────────
  if (loading) return <Spinner />;

  return (
    <div className="teacher-dashboard animate-fade-in">

      {/* ── Error Banner ── */}
      {error && (
        <div className="dash-error-banner">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
          <button className="btn btn-sm btn-secondary" onClick={() => fetchDashboardData(false)}>
            Retry
          </button>
        </div>
      )}

      {/* ── Hero Header ── */}
      <div className="dashboard-hero">
        <div className="dashboard-hero-text">
          <div className="hero-greeting">Good {timeGreet()}, {firstName}! 👋</div>
          <h2 className="hero-title">Here's your teaching overview.</h2>
          <p className="hero-subtitle">
            Manage assignments, review AI evaluations, and track your students' progress — all in one place.
          </p>
          {lastRefreshed && (
            <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>
              Last updated: {lastRefreshed.toLocaleTimeString()}
              {refreshing && <span style={{ marginLeft: '8px', color: '#4f46e5' }}>⟳ Refreshing…</span>}
            </p>
          )}
        </div>
        <div className="hero-actions">
          <button className="btn btn-primary btn-md" onClick={() => navigate('/teacher/upload')}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              style={{ marginRight: '6px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            New Assignment
          </button>
          <button className="btn btn-secondary btn-sm"
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            title="Refresh analytics">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              style={{ marginRight: '5px', ...(refreshing && { animation: 'spin 1s linear infinite' }) }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── KPI Cards — 4 horizontal ── */}
      <div className="stats-grid cols-4">

        {/* Total Assignments */}
        <GlassCard className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(79,70,229,0.08)', color: '#4f46e5' }}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13
                   C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13
                   C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13
                   C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.total_assignments}</div>
            <div className="stat-label">Total Assignments</div>
            <div className="stat-sub">Created by you</div>
          </div>
        </GlassCard>

        {/* Total Students */}
        <GlassCard className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(168,85,247,0.08)', color: '#7c3aed' }}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857
                   M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857
                   m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.total_students}</div>
            <div className="stat-label">Active Students</div>
            <div className="stat-sub">Submitted to your assignments</div>
          </div>
        </GlassCard>

        {/* Pending Reviews */}
        <GlassCard className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.08)', color: '#d97706' }}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.pending_reviews}</div>
            <div className="stat-label">Pending Reviews</div>
            <div className="stat-sub">Awaiting AI evaluation</div>
          </div>
          {stats.pending_approval > 0 && (
            <div className="stat-badge" style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706' }}>
              +{stats.pending_approval} ready to publish
            </div>
          )}
        </GlassCard>

        {/* Published Results */}
        <GlassCard className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.08)', color: '#059669' }}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.published_results}</div>
            <div className="stat-label">Published Results</div>
            <div className="stat-sub">Grades released to students</div>
          </div>
        </GlassCard>
      </div>

      {/* ── Charts Grid ── */}
      <div className="charts-container-grid">

        {/* Bar Chart — Class Averages by Assignment */}
        <GlassCard className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <h3 className="chart-title" style={{ margin: 0 }}>Class Averages by Assignment</h3>
            {allBarData.length > 0 && barData.length === 0 && (
              <span style={{
                fontSize: '11px', color: '#f59e0b', background: 'rgba(245,158,11,0.08)',
                padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(245,158,11,0.2)'
              }}>
                Awaiting evaluations
              </span>
            )}
          </div>
          <div className="chart-wrapper">
            {allBarData.length === 0 ? (
              <div className="empty-chart">
                <svg width="36" height="36" fill="none" stroke="#d1d5db" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p>No assignments yet. Create your first assignment to see performance charts.</p>
              </div>
            ) : barData.length === 0 ? (
              <div className="empty-chart">
                <svg width="36" height="36" fill="none" stroke="#d1d5db" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>Charts will appear here once you evaluate student submissions.</p>
                <Link to="/teacher/submissions" className="btn btn-primary btn-sm" style={{ marginTop: '10px' }}>
                  Go to Submissions →
                </Link>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f8" vertical={false} />
                  <XAxis
                    dataKey="title"
                    tickFormatter={truncate}
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(79,70,229,0.04)' }} />
                  <Bar dataKey="average_marks" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {barData.map((entry, index) => (
                      <Cell
                        key={`bar-${index}`}
                        fill={index % 3 === 0 ? '#4f46e5' : index % 3 === 1 ? '#7c3aed' : '#06b6d4'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>

        {/* Pie Chart — Evaluation Status Mix */}
        <GlassCard className="chart-card pie-chart-card">
          <h3 className="chart-title">Evaluation Status Mix</h3>
          <div className="chart-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {pieData.length === 0 ? (
              <div className="empty-chart">
                <svg width="36" height="36" fill="none" stroke="#d1d5db" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                    d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                    d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
                <p>No submissions yet. The status distribution will appear here.</p>
              </div>
            ) : (
              <div className="pie-layout">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`pie-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pie-legend">
                  {pieData.map((item, index) => (
                    <div key={index} className="legend-item">
                      <span className="legend-dot" style={{ background: item.color }} />
                      <span className="legend-label">{item.name}</span>
                      <span className="legend-count">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* ── Recent Submissions Table ── */}
      <GlassCard className="submissions-section">
        <div className="section-header flex-between" style={{ marginBottom: '14px' }}>
          <h3 style={{ fontSize: '15px', fontFamily: 'var(--font-display)', fontWeight: 700, color: '#1e1b4b' }}>
            Recent Student Submissions
          </h3>
          <Link to="/teacher/submissions" className="btn btn-secondary btn-sm">View All</Link>
        </div>

        <div className="table-container">
          {recentSubmissions.length === 0 ? (
            <div className="empty-table-state">
              <svg width="32" height="32" fill="none" stroke="#d1d5db" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586
                     a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>No student submissions yet. Share your assignments so students can submit.</p>
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Assignment</th>
                  <th>Subject</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentSubmissions.map((sub) => (
                  <tr key={sub.id}>
                    <td style={{ fontWeight: 600, color: '#1e1b4b' }}>{sub.student_name}</td>
                    <td style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sub.assignment_title}
                    </td>
                    <td>{sub.assignment_subject}</td>
                    <td style={{ color: '#6b7280', fontSize: '12px' }}>
                      {new Date(sub.submitted_at).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </td>
                    <td>
                      {!sub.has_evaluation && (
                        <span className="badge badge-pending">Not Evaluated</span>
                      )}
                      {sub.has_evaluation && sub.evaluation_status === 'PENDING' && (
                        <span className="badge badge-evaluated">Ready to Publish</span>
                      )}
                      {sub.has_evaluation && sub.evaluation_status === 'PUBLISHED' && (
                        <span className="badge badge-published">Published</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {sub.final_marks !== null && sub.final_marks !== undefined
                        ? `${sub.final_marks} / ${sub.total_marks}`
                        : <span style={{ color: '#9ca3af' }}>—</span>
                      }
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="table-actions" style={{ justifyContent: 'center' }}>
                        {!sub.has_evaluation ? (
                          <button
                            className="action-btn action-btn-success"
                            onClick={() => navigate(`/teacher/evaluation/${sub.id}?trigger=true`)}
                          >
                            ⚡ AI Evaluate
                          </button>
                        ) : (
                          <Link
                            to={`/teacher/evaluation/${sub.id}`}
                            className="action-btn action-btn-primary"
                          >
                            {sub.evaluation_status === 'PENDING' ? '✏️ Review & Publish' : '👁 View Report'}
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </GlassCard>

      {/* ── Styles ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        .teacher-dashboard {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* Error banner */
        .dash-error-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 18px;
          background: rgba(239,68,68,0.06);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 12px;
          color: #b91c1c;
          font-size: 13px;
          font-weight: 500;
        }
        .dash-error-banner svg { flex-shrink: 0; }
        .dash-error-banner span { flex: 1; }

        /* Loading spinner */
        .dash-spinner {
          width: 40px; height: 40px;
          border: 3px solid #e5e7eb;
          border-top-color: #4f46e5;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* KPI sub-label */
        .stat-sub {
          font-size: 11px;
          color: #9ca3af;
          margin-top: 2px;
        }

        /* Small badge inside stat card */
        .stat-badge {
          margin-top: 8px;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 20px;
          display: inline-block;
        }

        /* Charts grid */
        .charts-container-grid {
          display: grid;
          grid-template-columns: 1.8fr 1fr;
          gap: 20px;
        }
        @media (max-width: 992px) {
          .charts-container-grid { grid-template-columns: 1fr; }
        }

        .chart-card { padding: 22px 24px; }

        .chart-title {
          font-size: 15px;
          font-family: var(--font-display);
          font-weight: 700;
          color: #1e1b4b;
          border-left: 3px solid #4f46e5;
          padding-left: 10px;
          margin-bottom: 18px;
        }

        .chart-wrapper { min-height: 220px; }

        /* Empty chart state */
        .empty-chart {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 220px;
          gap: 10px;
          color: #9ca3af;
          font-size: 13px;
          text-align: center;
          max-width: 280px;
          margin: 0 auto;
        }

        /* Pie chart */
        .pie-layout {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .pie-legend {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 12px;
          width: 100%;
          padding: 0 12px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12.5px;
        }

        .legend-dot {
          width: 9px; height: 9px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .legend-label { flex: 1; color: #4b5563; font-weight: 500; }

        .legend-count {
          font-weight: 700;
          color: #1e1b4b;
          background: #f3f4f6;
          padding: 1px 7px;
          border-radius: 20px;
          font-size: 11.5px;
        }

        /* Submissions table */
        .submissions-section { padding: 22px 24px; }

        .empty-table-state {
          padding: 40px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: #9ca3af;
          font-size: 13.5px;
          text-align: center;
        }
      `}} />
    </div>
  );
};

export default TeacherDashboard;
