import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../../services/api';
import GlassCard from '../../components/GlassCard';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, BarChart, Bar,
  LabelList
} from 'recharts';

// ─────────────────────────────────────────────────────────────────────────────
// Custom Tooltip for the Comparison Bar Chart
// ─────────────────────────────────────────────────────────────────────────────
const ComparisonTooltip = ({ active, payload, label }) => {
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

// ─────────────────────────────────────────────────────────────────────────────
// Custom Tooltip for the Line Chart (trend over time)
// ─────────────────────────────────────────────────────────────────────────────
const LineTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: '#0f172a',
      border: '1px solid #334155',
      borderRadius: '12px',
      padding: '10px 14px',
      boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
      zIndex: 1000
    }}>
      <p style={{ fontSize: '11.5px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', marginBottom: '4px' }}>
          <span style={{ fontSize: '12px', color: p.stroke === '#8b5cf6' ? '#c4b5fd' : '#7dd3fc' }}>
            {p.dataKey}
          </span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: p.stroke === '#8b5cf6' ? '#a78bfa' : '#38bdf8' }}>
            {p.value}%
          </span>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Custom Legend for Comparison Bar Chart
// ─────────────────────────────────────────────────────────────────────────────
const ComparisonLegend = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        width: '28px', height: '10px', borderRadius: '4px',
        background: '#8b5cf6',
      }} />
      <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>My Marks %</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        width: '28px', height: '10px', borderRadius: '4px',
        background: '#0284c7',
      }} />
      <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>Class Average %</span>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────
function roundTo1(num) {
  const val = Number(num);
  if (isNaN(val)) return 0.0;
  return Math.round(val * 10) / 10;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const StudentReports = () => {
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await reportsAPI.getStudentAnalytics();
        console.log("Raw Student Analytics API Response:", res.data);
        setAnalytics(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to load student reports:', err);
        setAnalytics([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <div className="loading-container">Compiling Report Analytics...</div>;

  // ── KPI calculations ──────────────────────────────────────────────────────
  const gradedCount = analytics.length;

  const studentAverage = gradedCount > 0
    ? roundTo1(analytics.reduce((acc, a) => acc + ((Number(a.student_score) / Number(a.total_marks)) * 100), 0) / gradedCount)
    : 0.0;

  const classAverage = gradedCount > 0
    ? roundTo1(analytics.reduce((acc, a) => acc + ((Number(a.class_average) / Number(a.total_marks)) * 100), 0) / gradedCount)
    : 0.0;

  const highestScoreRatio = gradedCount > 0
    ? roundTo1(Math.max(...analytics.map(a => (Number(a.student_score) / Number(a.total_marks)) * 100)))
    : 0.0;

  // ── Formatted Chart Data with Strict Number Parsing ───────────────────────
  const chartData = analytics.map(a => {
    const studentScore = Number(a.student_score) || 0;
    const classAvg     = Number(a.class_average) || 0;
    const totalMarks   = Number(a.total_marks) || 100;

    const myMarksPct = roundTo1((studentScore / totalMarks) * 100);
    const classAvgPct = roundTo1((classAvg / totalMarks) * 100);

    const item = {
      name: a.title && a.title.length > 13 ? a.title.substring(0, 13) + '…' : (a.title || 'Assignment'),
      fullName: a.title || 'Assignment',
      'My Marks %': myMarksPct,
      'Class Avg %': classAvgPct,
    };
    console.log("Processed Chart Data Item:", item);
    return item;
  });

  return (
    <div className="student-reports animate-fade-in">

      <div className="section-header">
        <p className="section-subtitle">
          Analyze your grading trends, subject-wise strengths, and performance milestones.
        </p>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="stats-grid cols-3">
        <GlassCard className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>📊</div>
          <div className="stat-info">
            <div className="stat-value">{studentAverage}%</div>
            <div className="stat-label">My Cumulative Average</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Across all graded work</div>
          </div>
        </GlassCard>

        <GlassCard className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(2,132,199,0.1)', color: '#0284c7' }}>👥</div>
          <div className="stat-info">
            <div className="stat-value">{classAverage}%</div>
            <div className="stat-label">Class Average Cumulative</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>All students combined</div>
          </div>
        </GlassCard>

        <GlassCard className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#059669' }}>🏆</div>
          <div className="stat-info">
            <div className="stat-value">{highestScoreRatio}%</div>
            <div className="stat-label">My Peak Score Ratio</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Best assignment result</div>
          </div>
        </GlassCard>
      </div>

      {/* ── Charts ────────────────────────────────────────────────────────── */}
      <div className="student-reports-charts">

        {/* ── Primary: My Performance vs Class Average (BAR CHART) ────────── */}
        <GlassCard className="chart-large-card">
          <h3 className="chart-title" style={{ borderLeftColor: '#8b5cf6' }}>
            My Performance vs. Class Average
          </h3>

          {chartData.length === 0 ? (
            <div className="empty-chart-state">
              <svg width="40" height="40" fill="none" stroke="#cbd5e1" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p>No published assignment analytics found. Your chart will appear once results are graded.</p>
            </div>
          ) : (
            <>
              <ComparisonLegend />
              <div style={{ width: '100%', height: '340px', minHeight: '340px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 30, right: 20, left: 15, bottom: 25 }}
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
                      tick={{ fill: '#334155', fontSize: 12, fontWeight: 600 }}
                      tickLine={{ stroke: '#cbd5e1' }}
                      axisLine={{ stroke: '#94a3b8', strokeWidth: 1.5 }}
                    />

                    <YAxis
                      type="number"
                      domain={[0, 100]}
                      ticks={[0, 20, 40, 60, 80, 100]}
                      tickFormatter={v => `${v}%`}
                      tick={{ fill: '#334155', fontSize: 12, fontWeight: 600 }}
                      tickLine={{ stroke: '#cbd5e1' }}
                      axisLine={{ stroke: '#94a3b8', strokeWidth: 1.5 }}
                      label={{
                        value: 'Percentage (%)',
                        angle: -90,
                        position: 'insideLeft',
                        offset: -2,
                        style: { fill: '#475569', fontSize: 12, fontWeight: 700 }
                      }}
                    />

                    <Tooltip
                      content={<ComparisonTooltip />}
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
                        style={{ fill: '#6d28d9', fontSize: 11, fontWeight: 800, fontFamily: 'Inter, sans-serif' }}
                        offset={6}
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
                        style={{ fill: '#0369a1', fontSize: 11, fontWeight: 800, fontFamily: 'Inter, sans-serif' }}
                        offset={6}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </GlassCard>

        {/* ── Secondary: Score Trend (LINE CHART) ───────────────────────── */}
        <GlassCard className="chart-secondary-card">
          <h3 className="chart-title" style={{ borderLeftColor: '#0284c7' }}>
            Score Trend Over Assignments
          </h3>

          {chartData.length === 0 ? (
            <div className="empty-chart-state">
              <p>No data available yet.</p>
            </div>
          ) : (
            <div style={{ width: '100%', height: '260px', minHeight: '260px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 15, right: 20, left: 15, bottom: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#334155', fontSize: 12, fontWeight: 500 }}
                    tickLine={{ stroke: '#cbd5e1' }}
                    axisLine={{ stroke: '#94a3b8' }}
                  />
                  <YAxis
                    type="number"
                    domain={[0, 100]}
                    ticks={[0, 20, 40, 60, 80, 100]}
                    tickFormatter={v => `${v}%`}
                    tick={{ fill: '#334155', fontSize: 12, fontWeight: 500 }}
                    tickLine={{ stroke: '#cbd5e1' }}
                    axisLine={{ stroke: '#94a3b8' }}
                  />
                  <Tooltip content={<LineTooltip />} />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => (
                      <span style={{ color: '#334155', fontSize: '12px', fontWeight: 600 }}>{value}</span>
                    )}
                  />
                  <Line
                    type="monotone"
                    dataKey="My Marks %"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{ fill: '#8b5cf6', strokeWidth: 0, r: 5 }}
                    activeDot={{ r: 8, fill: '#7c3aed', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Class Avg %"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    strokeDasharray="5 4"
                    dot={{ fill: '#0284c7', strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 7, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>
      </div>

      {/* ── Detailed Marks Ledger ─────────────────────────────────────────── */}
      <GlassCard className="reports-table-card">
        <h3 className="chart-title" style={{ borderLeftColor: '#059669' }}>Academic Marks Ledger</h3>
        <div className="table-container">
          {analytics.length === 0 ? (
            <div className="empty-table-state">No graded records on file yet.</div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Assignment</th>
                  <th>Subject</th>
                  <th>My Marks</th>
                  <th>Class Average</th>
                  <th>Total Marks</th>
                  <th>Grade</th>
                  <th>Performance Gap</th>
                </tr>
              </thead>
              <tbody>
                {analytics.map((a, idx) => {
                  const studentScore = Number(a.student_score) || 0;
                  const classAvg     = Number(a.class_average) || 0;
                  const gap          = roundTo1(studentScore - classAvg);
                  const isPositive   = gap >= 0;
                  return (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{a.title}</td>
                      <td style={{ color: '#334155' }}>{a.subject}</td>
                      <td>
                        <strong style={{ color: '#7c3aed', fontSize: '13.5px' }}>{studentScore}</strong>
                      </td>
                      <td style={{ color: '#0284c7', fontWeight: 600 }}>{classAvg}</td>
                      <td style={{ color: '#64748b' }}>{a.total_marks}</td>
                      <td><span className="grade-pill">{a.grade}</span></td>
                      <td>
                        <span className={`gap-pill ${isPositive ? 'gap-positive' : 'gap-negative'}`}>
                          {isPositive ? `+${gap}` : gap} marks
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </GlassCard>

      {/* ── Styles ───────────────────────────────────────────────────────── */}
      <style dangerouslySetInnerHTML={{ __html: `
        .student-reports {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .section-subtitle {
          color: #475569;
          font-size: 13.5px;
          margin-top: 2px;
        }

        .student-reports-charts {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .chart-large-card {
          padding: 24px 26px;
        }

        .chart-secondary-card {
          padding: 22px 26px;
        }

        .chart-title {
          font-size: 15px;
          font-family: var(--font-display);
          font-weight: 700;
          color: #0f172a;
          border-left: 3.5px solid #8b5cf6;
          padding-left: 11px;
          margin-bottom: 18px;
          line-height: 1.4;
        }

        .empty-chart-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 220px;
          gap: 12px;
          color: #64748b;
          font-size: 13px;
          text-align: center;
          max-width: 300px;
          margin: 0 auto;
        }

        .reports-table-card { padding: 22px 24px; }

        .empty-table-state {
          padding: 32px;
          color: #64748b;
          font-size: 13.5px;
          text-align: center;
        }

        .grade-pill {
          background: linear-gradient(135deg, #4f46e5, #818cf8);
          color: #ffffff;
          padding: 3px 10px;
          font-size: 12px;
          border-radius: 6px;
          font-weight: 700;
          font-family: var(--font-display);
          display: inline-block;
        }

        .gap-pill {
          font-size: 12px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 6px;
          display: inline-block;
        }

        .gap-positive {
          background: rgba(16, 185, 129, 0.1);
          color: #047857;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .gap-negative {
          background: rgba(239, 68, 68, 0.08);
          color: #b91c1c;
          border: 1px solid rgba(239, 68, 68, 0.25);
        }

        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 40vh;
          font-size: 16px;
          font-family: var(--font-display);
          color: #475569;
        }

        @media (max-width: 768px) {
          .chart-large-card,
          .chart-secondary-card { padding: 16px 14px; }
          .chart-title { font-size: 14px; }
        }
      `}} />
    </div>
  );
};

export default StudentReports;
