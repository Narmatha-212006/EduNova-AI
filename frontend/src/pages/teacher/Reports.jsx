import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reportsAPI } from '../../services/api';
import GlassCard from '../../components/GlassCard';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

const Reports = () => {
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      const res = await reportsAPI.getTeacherAnalytics();
      setAnalytics(res.data);
    } catch (err) {
      console.error("Failed to load reports data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  if (loading) {
    return <div className="loading-container">Compiling Analytics Reports...</div>;
  }

  // Calculate global metrics across all assignments
  const assignmentsWithGrades = analytics.filter(a => a.submission_count > 0);
  const totalSubmissions = analytics.reduce((acc, a) => acc + a.submission_count, 0);
  
  const globalAverage = assignmentsWithGrades.length > 0
    ? roundTo1(assignmentsWithGrades.reduce((acc, a) => acc + a.average_marks, 0) / assignmentsWithGrades.length)
    : 0.0;
    
  const globalHighest = assignmentsWithGrades.length > 0
    ? Math.max(...assignmentsWithGrades.map(a => a.highest_marks))
    : 0.0;

  function roundTo1(num) {
    return Math.round(num * 10) / 10;
  }

  return (
    <div className="reports-page animate-fade-in">
      <div className="section-header">
        <p className="section-subtitle">Analyze class performance trends, compare test scores, and monitor evaluation progress.</p>
      </div>

      {/* Analytics KPI cards — 3 cards horizontal */}
      <div className="stats-grid cols-3">
        <GlassCard className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div className="stat-info">
            <div className="stat-value">{globalAverage}%</div>
            <div className="stat-label">Class Average Grade</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>Across all assignments</div>
          </div>
        </GlassCard>

        <GlassCard className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-success)' }}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="stat-info">
            <div className="stat-value">{globalHighest}</div>
            <div className="stat-label">Highest Score Registered</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>Best result in any assignment</div>
          </div>
        </GlassCard>

        <GlassCard className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(236, 72, 153, 0.1)', color: 'var(--accent)' }}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div className="stat-info">
            <div className="stat-value">{totalSubmissions}</div>
            <div className="stat-label">Total Student Answers</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>All submissions on record</div>
          </div>
        </GlassCard>
      </div>

      {/* Main Charts */}
      <div className="reports-charts-grid">
        <GlassCard className="chart-large-card">
          <h3 className="chart-title">Detailed Assignment Performance Comparison</h3>
          <div className="chart-wrapper">
            {analytics.length === 0 ? (
              <div className="empty-chart flex-center">Create assignments to compile performance graphics.</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={analytics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis dataKey="title" stroke="var(--text-secondary)" fontSize={11} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} label={{ value: 'Marks', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)' }} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(13, 12, 36, 0.95)', 
                      borderColor: 'var(--border-color)', 
                      borderRadius: '8px', 
                      color: 'var(--text-primary)' 
                    }} 
                  />
                  <Legend verticalAlign="top" height={36} />
                  
                  {/* Min Max Average bars and line */}
                  <Bar dataKey="highest_marks" name="Highest Score" fill="#10b981" alpha={0.7} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="average_marks" name="Class Average" fill="#3b82f6" alpha={0.9} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lowest_marks" name="Lowest Score" fill="#ef4444" alpha={0.7} radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="average_marks" name="Trend Line" stroke="#a855f7" strokeWidth={3} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>

        {/* Area charts showing upload volume */}
        <GlassCard className="chart-large-card">
          <h3 className="chart-title">Submission Volumes by Assignment</h3>
          <div className="chart-wrapper">
            {analytics.length === 0 ? (
              <div className="empty-chart flex-center">No upload data recorded.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={analytics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis dataKey="title" stroke="var(--text-secondary)" fontSize={11} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(13, 12, 36, 0.95)', 
                      borderColor: 'var(--border-color)', 
                      borderRadius: '8px', 
                      color: 'var(--text-primary)' 
                    }} 
                  />
                  <Area type="monotone" dataKey="submission_count" name="Submissions" stroke="#ec4899" fill="url(#colorUpl)" />
                  <defs>
                    <linearGradient id="colorUpl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Assignment-wise Table Stats */}
      <GlassCard className="reports-table-card">
        <h3 className="chart-title">Assignment Performance Ledger</h3>
        <div className="table-container">
          {analytics.length === 0 ? (
            <div className="empty-table-state text-center">No reports compiled yet.</div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Assignment</th>
                  <th>Subject</th>
                  <th>Answers Uploaded</th>
                  <th>AI Evaluated</th>
                  <th>Final Marks Published</th>
                  <th>Average Score</th>
                  <th>Score Range</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {analytics.map((ass) => (
                  <tr key={ass.assignment_id}>
                    <td style={{ fontWeight: 600 }}>{ass.title}</td>
                    <td>{ass.subject}</td>
                    <td>{ass.submission_count}</td>
                    <td>{ass.evaluated_count}</td>
                    <td>{ass.published_count}</td>
                    <td>
                      <span className="avg-marks-highlight">{ass.average_marks}</span> / {ass.lowest_marks === 0 && ass.highest_marks === 0 ? '100' : 'Max'}
                    </td>
                    <td>
                      {ass.submission_count > 0 ? (
                        <span>
                          Min: <strong style={{ color: 'var(--status-error)' }}>{ass.lowest_marks}</strong> | Max:{' '}
                          <strong style={{ color: 'var(--status-success)' }}>{ass.highest_marks}</strong>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>--</span>
                      )}
                    </td>
                    <td>
                      <Link to={`/teacher/submissions?assignment_id=${ass.assignment_id}`} className="btn btn-secondary btn-sm">
                        Review List
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </GlassCard>

      <style dangerouslySetInnerHTML={{__html: `
        .reports-page {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .reports-charts-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 20px;
        }

        @media (max-width: 992px) {
          .reports-charts-grid {
            grid-template-columns: 1fr;
          }
        }

        .chart-large-card {
          padding: 24px;
        }

        .avg-marks-highlight {
          font-weight: 700;
          color: var(--secondary);
        }
      `}} />
    </div>
  );
};

export default Reports;
