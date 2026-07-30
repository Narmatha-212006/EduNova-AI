import React, { useState, useEffect } from 'react';
import { assignmentsAPI, submissionsAPI, evaluationsAPI } from '../../services/api';
import GlassCard from '../../components/GlassCard';

const MySubmissions = () => {
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const assignRes = await assignmentsAPI.getAll();
        setAssignments(assignRes.data);

        const subs = [];
        for (const a of assignRes.data) {
          try {
            const subRes = await submissionsAPI.getStudentSubmission(a.id);
            subs.push({ ...subRes.data, assignment: a });
          } catch (err) {
            // Not submitted for this assignment
          }
        }
        setSubmissions(subs);
      } catch (err) {
        console.error('Failed to fetch submissions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const viewReport = async (sub) => {
    try {
      setReportLoading(true);
      const res = await evaluationsAPI.getReport(sub.id);
      setSelectedReport({ ...res.data, submission: sub });
    } catch (err) {
      console.error('Failed to load report:', err);
      alert(err.response?.data?.detail || 'Report not available yet.');
    } finally {
      setReportLoading(false);
    }
  };

  const handlePrint = () => window.print();

  if (loading) return <div className="loading-container">Loading Your Submissions...</div>;

  return (
    <div className="my-submissions animate-fade-in">
      <div className="section-header">
        <p className="section-subtitle">Track your submitted assignments, view AI feedback, and download reports.</p>
      </div>

      {submissions.length === 0 ? (
        <GlassCard>
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            You haven't submitted any assignments yet. Visit the Assignments page to get started.
          </div>
        </GlassCard>
      ) : (
        <div className="table-container">
          <GlassCard>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Assignment</th>
                  <th>Subject</th>
                  <th>Submitted On</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Grade</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map(sub => (
                  <tr key={sub.id}>
                    <td style={{ fontWeight: 600 }}>{sub.assignment_title}</td>
                    <td>{sub.assignment_subject}</td>
                    <td>{new Date(sub.submitted_at).toLocaleDateString()}</td>
                    <td>
                      {!sub.has_evaluation && <span className="badge badge-pending">Awaiting Review</span>}
                      {sub.has_evaluation && sub.evaluation_status === 'PENDING' && <span className="badge badge-evaluated">Under Review</span>}
                      {sub.has_evaluation && sub.evaluation_status === 'PUBLISHED' && <span className="badge badge-published">Graded</span>}
                    </td>
                    <td>
                      {sub.final_marks !== null ? (
                        <strong style={{ color: 'var(--secondary)' }}>{sub.final_marks} / {sub.total_marks}</strong>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>--</span>
                      )}
                    </td>
                    <td>
                      {sub.grade ? (
                        <span className="grade-pill">{sub.grade}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>--</span>
                      )}
                    </td>
                    <td>
                      {sub.has_evaluation && sub.evaluation_status === 'PUBLISHED' ? (
                        <button className="btn btn-primary btn-sm" onClick={() => viewReport(sub)}>
                          View Report
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        </div>
      )}

      {/* Report Modal */}
      {selectedReport && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="modal-content report-modal animate-fade-in" onClick={e => e.stopPropagation()}>

            {/* Modal Header Row: Download left, Close right */}
            <div className="report-modal-header no-print">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="report-modal-icon">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1e1b4b', fontFamily: 'var(--font-display)' }}>AI Evaluation Report</h3>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '1px' }}>{selectedReport.submission?.student_name} · {selectedReport.submission?.assignment_title}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button className="btn btn-primary btn-sm no-print" onClick={handlePrint}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2v-5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </button>
                <button className="modal-close-btn no-print" onClick={() => setSelectedReport(null)} title="Close">
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Printable report content */}
            <div className="printable-report">
              <div className="print-header-block">
                <h1 style={{ textAlign: 'center', fontSize: '20px', marginBottom: '10px' }}>INTELLIGRADE — STUDENT EVALUATION REPORT</h1>
                <div className="print-info-grid">
                  <div><strong>Student:</strong> {selectedReport.submission.student_name}</div>
                  <div><strong>Subject:</strong> {selectedReport.submission.assignment_subject}</div>
                  <div><strong>Assignment:</strong> {selectedReport.submission.assignment_title}</div>
                  <div><strong>Date:</strong> {new Date(selectedReport.submission.submitted_at).toLocaleDateString()}</div>
                </div>
              </div>

              <div className="report-scores-row">
                <div className="report-score-box">
                  <div className="score-big text-gradient">{selectedReport.teacher_marks || selectedReport.ai_marks}</div>
                  <div className="score-label">Final Marks (/{selectedReport.submission.total_marks})</div>
                </div>
                <div className="report-score-box">
                  <div className="score-big text-gradient">{selectedReport.grade}</div>
                  <div className="score-label">Grade</div>
                </div>
                <div className="report-score-box">
                  <div className="score-big">{selectedReport.accuracy}%</div>
                  <div className="score-label">Accuracy</div>
                </div>
                <div className="report-score-box">
                  <div className="score-big">{selectedReport.completeness}%</div>
                  <div className="score-label">Completeness</div>
                </div>
              </div>

              <div className="report-progress-bars">
                <div>
                  <div className="flex-between" style={{ fontSize: '12px', marginBottom: '4px' }}>
                    <span>Accuracy</span><strong>{selectedReport.accuracy}%</strong>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${selectedReport.accuracy}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex-between" style={{ fontSize: '12px', marginBottom: '4px' }}>
                    <span>Completeness</span><strong>{selectedReport.completeness}%</strong>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${selectedReport.completeness}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="report-feedback-box">
                <h4>Overall Feedback</h4>
                <p>{selectedReport.overall_feedback}</p>
              </div>

              <div className="report-lists-grid">
                <div className="report-list-card strengths-card">
                  <h5>✅ Strengths</h5>
                  <ul>{selectedReport.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
                <div className="report-list-card mistakes-card">
                  <h5>❌ Mistakes</h5>
                  <ul>{selectedReport.mistakes.map((m, i) => <li key={i}>{m}</li>)}</ul>
                </div>
                <div className="report-list-card missing-card">
                  <h5>⚠️ Missing Topics</h5>
                  <ul>{selectedReport.missing_topics.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </div>
                <div className="report-list-card suggestions-card">
                  <h5>💡 Suggestions</h5>
                  <ul>{selectedReport.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .my-submissions { display: flex; flex-direction: column; gap: 24px; }
        .section-header h2 { font-size: 24px; font-family: var(--font-display); font-weight: 700; }
        .section-header p { color: var(--text-secondary); font-size: 13.5px; margin-top: 4px; }

        .grade-pill { background: var(--gradient-main); color: #fff; padding: 3px 10px; font-size: 12px; border-radius: 5px; font-weight: 700; }
        .btn-xs { padding: 6px 12px; font-size: 12px; border-radius: 6px; }

        .modal-overlay {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(79, 70, 229, 0.06);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 999;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 24px;
          overflow-y: auto;
        }

        .report-modal {
          width: 100%;
          max-width: 1050px;
          max-height: 90vh;
          overflow-y: auto;
          padding: 28px 32px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(79,70,229,0.12), 0 4px 16px rgba(0,0,0,0.06);
          animation: modalScaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          position: relative;
        }

        @keyframes modalScaleIn {
          from { opacity: 0; transform: scale(0.96) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        .report-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #f3f4f6;
        }

        .report-modal-icon {
          width: 36px; height: 36px;
          border-radius: 10px;
          background: rgba(79,70,229,0.08);
          color: #4f46e5;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .modal-close-btn {
          width: 34px; height: 34px;
          border-radius: 9px;
          background: #f3f4f6;
          border: 1.5px solid #e5e7eb;
          color: #6b7280;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          outline: none;
          transition: all 0.15s ease;
        }

        .modal-close-btn:hover {
          background: #fee2e2;
          border-color: rgba(239,68,68,0.3);
          color: #ef4444;
        }

        .report-scores-row {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
          margin: 20px 0;
        }
        .report-score-box {
          text-align: center; padding: 16px 10px;
          border: 1px solid #e5e7eb; border-radius: 12px;
          background: #f8f9ff;
        }
        .score-big { font-size: 28px; font-weight: 800; font-family: var(--font-display); color: #1e1b4b; }
        .score-label { font-size: 11px; color: #9ca3af; margin-top: 4px; }

        .report-progress-bars { display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px; }

        .report-feedback-box {
          padding: 16px; border-radius: 12px;
          border: 1px solid #e5e7eb; background: #f8f9ff;
          margin-bottom: 20px;
        }
        .report-feedback-box h4 { font-size: 14px; font-family: var(--font-display); margin-bottom: 8px; color: #1e1b4b; }
        .report-feedback-box p { font-size: 13px; color: #4b5563; line-height: 1.6; }

        .report-lists-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 600px) { .report-lists-grid { grid-template-columns: 1fr; } }
        .report-list-card {
          padding: 14px; border-radius: 12px;
          border: 1px solid #e5e7eb; background: #f8f9ff;
        }
        .report-list-card h5 { font-size: 13px; font-family: var(--font-display); margin-bottom: 8px; color: #1e1b4b; }
        .report-list-card ul { padding-left: 16px; font-size: 12px; color: #4b5563; display: flex; flex-direction: column; gap: 4px; }

        .loading-container { display: flex; justify-content: center; align-items: center; height: 40vh; font-size: 16px; font-family: var(--font-display); color: var(--text-secondary); }

        .print-header-block { display: none; }
        .print-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12px; margin-bottom: 15px; }

        @media print {
          @page { size: A4 portrait; margin: 18mm 15mm; }

          /* Hide everything outside the report */
          .no-print,
          .my-submissions,
          header.navbar,
          .sidebar { display: none !important; }

          /* Flatten modal overlay to static for print */
          .modal-overlay {
            background: #ffffff !important;
            position: static !important;
            padding: 0 !important;
            display: block !important;
          }

          .report-modal {
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            max-width: 100% !important;
            padding: 0 !important;
          }

          /* Show the institutional header */
          .print-header-block {
            display: block !important;
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 2px solid #1e3a8a;
          }

          .print-header-block h1 {
            font-size: 16pt;
            font-weight: 800;
            color: #1e3a8a !important;
          }

          .print-info-grid { color: #374151; }

          /* Score boxes */
          .report-score-box {
            background: #f0f4ff !important;
            border-color: #c7d2fe !important;
          }

          .score-big {
            color: #1e3a8a !important;
            -webkit-text-fill-color: #1e3a8a !important;
          }

          /* Feedback and list cards */
          .report-list-card, .report-feedback-box {
            background: #f9fafb !important;
            border-color: #e5e7eb !important;
          }

          .report-list-card ul { color: #374151 !important; }
          .report-feedback-box p { color: #374151 !important; }

          .report-progress-bars .progress-bar-container {
            background: #e5e7eb !important;
          }
        }
      `}} />
    </div>
  );
};

export default MySubmissions;
