import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reportsAPI, assignmentsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import GlassCard from '../../components/GlassCard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList
} from 'recharts';

// ─────────────────────────────────────────────────────────────────────────────
// Custom Tooltip for Student Dashboard Bar Chart
// ─────────────────────────────────────────────────────────────────────────────
const DashboardBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const myScore   = payload.find(p => p.dataKey === 'My Marks %');
  const classAvg  = payload.find(p => p.dataKey === 'Class Avg %');
  const dataItem  = payload[0]?.payload;
  const assignmentTitle = dataItem?.fullName || label;

  return (
    <div style={{
      background: '#0f172a',
      border: '1px solid #334155',
      borderRadius: '12px',
      padding: '12px 16px',
      boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
      minWidth: '190px',
      zIndex: 1000
    }}>
      <p style={{
        fontSize: '12px', fontWeight: 700, color: '#f8fafc',
        marginBottom: '10px', borderBottom: '1px solid #334155',
        paddingBottom: '6px', letterSpacing: '0.02em'
      }}>
        {assignmentTitle}
      </p>
      {myScore && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#8b5cf6' }} />
            <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 500 }}>My Score</span>
          </div>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#a78bfa' }}>{myScore.value}%</span>
        </div>
      )}
      {classAvg && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#0284c7' }} />
            <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 500 }}>Class Avg</span>
          </div>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8' }}>{classAvg.value}%</span>
        </div>
      )}
    </div>
  );
};

// Custom Legend for Comparison Bar Chart
const DashboardBarLegend = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    marginBottom: '12px',
    flexWrap: 'wrap',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{
        width: '24px', height: '9px', borderRadius: '3px',
        background: '#8b5cf6',
      }} />
      <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>My Marks %</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{
        width: '24px', height: '9px', borderRadius: '3px',
        background: '#0284c7',
      }} />
      <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Class Average %</span>
    </div>
  </div>
);

function roundTo1(num) {
  const val = Number(num);
  if (isNaN(val)) return 0.0;
  return Math.round(val * 10) / 10;
}

const StudentDashboard = () => {
  const { user } = useAuth();
  const firstName = user?.name ? user.name.split(' ')[0] : 'Student';
  const [stats, setStats] = useState({ total_assignments: 0, submitted_assignments: 0, pending_feedback: 0, published_results: 0 });
  const [upcomingAssignments, setUpcomingAssignments] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsRes, assignRes, analyticsRes] = await Promise.all([
          reportsAPI.getStudentDashboard(),
          assignmentsAPI.getAll(),
          reportsAPI.getStudentAnalytics(),
        ]);
        setStats(statsRes.data);
        const now = new Date();
        const upcoming = assignRes.data.filter(a => new Date(a.due_date) >= now).slice(0, 4);
        setUpcomingAssignments(upcoming);
        setAnalytics(Array.isArray(analyticsRes.data) ? analyticsRes.data : []);
      } catch (err) {
        console.error('Failed to load student dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Format Recharts comparative Bar chart data exactly matching My Reports logic
  const barChartData = analytics.map(a => {
    const studentScore = Number(a.student_score) || 0;
    const classAvg     = Number(a.class_average) || 0;
    const totalMarks   = Number(a.total_marks) || 100;

    return {
      name: a.title && a.title.length > 12 ? a.title.substring(0, 12) + '…' : (a.title || 'Assignment'),
      fullName: a.title || 'Assignment',
      'My Marks %': roundTo1((studentScore / totalMarks) * 100),
      'Class Avg %': roundTo1((classAvg / totalMarks) * 100),
    };
  });

  const getDaysLeft = (due) => {
    const diff = new Date(due) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) return <div className="loading-container">Loading Dashboard...</div>;

  return (
    <div className="student-dashboard animate-fade-in">
      {/* Hero Header */}
      <div className="dashboard-hero">
        <div className="dashboard-hero-text">
          <div className="hero-greeting">Welcome back, {firstName}! 🎓</div>
          <h2 className="hero-title">Track your academic journey.</h2>
          <p className="hero-subtitle">View assignments, submit your answers, and track your grades and AI feedback reports.</p>
        </div>
        <Link to="/student/assignments" className="btn btn-primary btn-md" style={{textDecoration:'none'}}>
          Browse Assignments
        </Link>
      </div>

      {/* Stats Grid — 4 cards horizontal */}
      <div className="stats-grid cols-4">
        {[
          { label: 'Available Assignments', value: stats.total_assignments, color: '#3b82f6', icon: '📋', desc: 'Open for submission' },
          { label: 'Submitted Answers', value: stats.submitted_assignments, color: '#a855f7', icon: '📤', desc: 'Files uploaded' },
          { label: 'Awaiting Feedback', value: stats.pending_feedback, color: '#f59e0b', icon: '⏳', desc: 'Pending evaluation' },
          { label: 'Published Grades', value: stats.published_results, color: '#10b981', icon: '✅', desc: 'Results released' },
        ].map((item, idx) => (
          <GlassCard key={idx} className="stat-card">
            <div className="stat-icon" style={{ background: `${item.color}18`, color: item.color }}>
              {item.icon}
            </div>
            <div className="stat-info">
              <div className="stat-value">{item.value}</div>
              <div className="stat-label">{item.label}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>{item.desc}</div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Charts + Upcoming Assignments */}
      <div className="student-main-grid">
        {/* Performance Comparison Bar Chart */}
        <GlassCard className="chart-card">
          <h3 className="chart-title">My Performance vs. Class Average</h3>
          {barChartData.length === 0 ? (
            <div className="empty-chart flex-center" style={{ height: '260px' }}>
              Submit assignments to see your performance chart.
            </div>
          ) : (
            <>
              <DashboardBarLegend />
              <div style={{ width: '100%', height: '280px', minHeight: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barChartData}
                    margin={{ top: 25, right: 15, left: 10, bottom: 20 }}
                    barCategoryGap="25%"
                    barGap={6}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e2e8f0"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }}
                      tickLine={{ stroke: '#cbd5e1' }}
                      axisLine={{ stroke: '#94a3b8', strokeWidth: 1.5 }}
                    />

                    <YAxis
                      type="number"
                      domain={[0, 100]}
                      ticks={[0, 20, 40, 60, 80, 100]}
                      tickFormatter={v => `${v}%`}
                      tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }}
                      tickLine={{ stroke: '#cbd5e1' }}
                      axisLine={{ stroke: '#94a3b8', strokeWidth: 1.5 }}
                      label={{
                        value: 'Percentage (%)',
                        angle: -90,
                        position: 'insideLeft',
                        offset: -2,
                        style: { fill: '#475569', fontSize: 11, fontWeight: 700 }
                      }}
                    />

                    <Tooltip
                      content={<DashboardBarTooltip />}
                      cursor={{ fill: 'rgba(139, 92, 246, 0.06)', radius: 6 }}
                    />

                    <Bar
                      dataKey="My Marks %"
                      fill="#8b5cf6"
                      stroke="#7c3aed"
                      strokeWidth={1}
                      radius={[6, 6, 0, 0]}
                    >
                      <LabelList
                        dataKey="My Marks %"
                        position="top"
                        formatter={(val) => `${val}%`}
                        style={{ fill: '#6d28d9', fontSize: 10.5, fontWeight: 800, fontFamily: 'Inter, sans-serif' }}
                        offset={5}
                      />
                    </Bar>

                    <Bar
                      dataKey="Class Avg %"
                      fill="#0284c7"
                      stroke="#0369a1"
                      strokeWidth={1}
                      radius={[6, 6, 0, 0]}
                    >
                      <LabelList
                        dataKey="Class Avg %"
                        position="top"
                        formatter={(val) => `${val}%`}
                        style={{ fill: '#0369a1', fontSize: 10.5, fontWeight: 800, fontFamily: 'Inter, sans-serif' }}
                        offset={5}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </GlassCard>

        {/* Upcoming Assignments */}
        <GlassCard className="upcoming-card">
          <div className="flex-between" style={{ marginBottom: '16px' }}>
            <h3 className="chart-title" style={{ margin: 0 }}>Upcoming Deadlines</h3>
            <Link to="/student/assignments" className="btn btn-secondary btn-sm">View All</Link>
          </div>
          {upcomingAssignments.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '13.5px', textAlign: 'center', padding: '40px 0' }}>
              No upcoming deadlines. Great job!
            </div>
          ) : (
            <div className="upcoming-list">
              {upcomingAssignments.map(a => {
                const daysLeft = getDaysLeft(a.due_date);
                const urgency = daysLeft <= 1 ? 'urgent' : daysLeft <= 3 ? 'warning' : 'normal';
                return (
                  <div key={a.id} className={`upcoming-item upcoming-${urgency}`}>
                    <div className="upcoming-title">{a.title}</div>
                    <div className="upcoming-meta">
                      <span>{a.subject}</span>
                      <span className={`days-badge days-${urgency}`}>
                        {daysLeft <= 0 ? 'Due Today!' : `${daysLeft}d left`}
                      </span>
                    </div>
                    <div className="upcoming-marks">{a.total_marks} marks · {a.department}</div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Published grades table */}
      {analytics.length > 0 && (
        <GlassCard>
          <h3 className="chart-title">My Published Grades Summary</h3>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Assignment</th>
                  <th>Subject</th>
                  <th>My Score</th>
                  <th>Class Average</th>
                  <th>Max Marks</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                {analytics.map((a, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{a.title}</td>
                    <td>{a.subject}</td>
                    <td><strong style={{ color: 'var(--secondary)' }}>{a.student_score}</strong></td>
                    <td>{a.class_average}</td>
                    <td>{a.total_marks}</td>
                    <td><span className="grade-pill">{a.grade}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .student-dashboard { display: flex; flex-direction: column; gap: 28px; }
        .dashboard-welcome h2 { font-size: 28px; font-family: var(--font-display); font-weight: 700; }
        .dashboard-welcome p { color: var(--text-secondary); font-size: 14px; margin-top: 4px; }

        .student-main-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 20px;
        }
        @media (max-width: 900px) { .student-main-grid { grid-template-columns: 1fr; } }

        .chart-title {
          font-size: 16px; font-family: var(--font-display);
          border-left: 3px solid var(--secondary);
          padding-left: 10px;
          margin-bottom: 16px;
        }

        .upcoming-list { display: flex; flex-direction: column; gap: 12px; }
        .upcoming-item {
          padding: 14px;
          border-radius: 10px;
          border: 1px solid var(--border-color);
          background: rgba(255,255,255,0.02);
          transition: all 0.2s ease;
        }
        .light-theme .upcoming-item { background: rgba(0,0,0,0.01); }
        .upcoming-item:hover { border-color: var(--border-color-hover); }
        .upcoming-urgent { border-color: rgba(239,68,68,0.3) !important; background: rgba(239,68,68,0.04) !important; }
        .upcoming-warning { border-color: rgba(245,158,11,0.3) !important; background: rgba(245,158,11,0.04) !important; }

        .upcoming-title { font-size: 14px; font-weight: 600; }
        .upcoming-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 6px; font-size: 12px; color: var(--text-secondary); }
        .upcoming-marks { font-size: 11.5px; color: var(--text-muted); margin-top: 4px; }

        .days-badge { padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .days-normal { background: rgba(16,185,129,0.1); color: var(--status-success); }
        .days-warning { background: rgba(245,158,11,0.15); color: var(--status-warning); }
        .days-urgent { background: rgba(239,68,68,0.15); color: var(--status-error); }

        .grade-pill {
          background: var(--gradient-main); color: #fff;
          padding: 3px 10px; font-size: 12px; border-radius: 5px; font-weight: 700;
        }

        .loading-container {
          display: flex; justify-content: center; align-items: center;
          height: 60vh; font-size: 18px; font-family: var(--font-display);
          color: var(--text-secondary);
        }

        .flex-center { display: flex; justify-content: center; align-items: center; }
        .empty-chart { color: var(--text-muted); font-size: 13px; flex-direction: column; gap: 10px; }
      `}} />
    </div>
  );
};

export default StudentDashboard;
