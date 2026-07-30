import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { submissionsAPI, evaluationsAPI } from '../../services/api';
import GlassCard from '../../components/GlassCard';

/* ─────────────── Circular Progress Ring ─────────────── */
const CircleProgress = ({ value = 0, size = 90, stroke = 7, color = 'var(--primary)' }) => {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
    </svg>
  );
};

/* ─────────────── Grade Badge ─────────────── */
const GradeBadge = ({ grade }) => {
  const map = {
    'A+': '#10b981', 'A': '#10b981', 'B+': '#3b82f6', 'B': '#3b82f6',
    'C+': '#f59e0b', 'C': '#f59e0b', 'D': '#f97316', 'F': '#ef4444'
  };
  const color = map[grade] || 'var(--text-muted)';
  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 16px',
      borderRadius: '20px',
      background: `${color}22`,
      border: `1.5px solid ${color}`,
      color: color,
      fontWeight: 800,
      fontSize: '20px',
      fontFamily: 'var(--font-display)',
    }}>
      {grade}
    </span>
  );
};

/* ─────────────── Main Component ─────────────── */
const EvaluationDetail = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoTrigger = searchParams.get('trigger') === 'true';

  const [submission, setSubmission] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [teacherMarks, setTeacherMarks] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSection, setActiveSection] = useState('summary');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const subRes = await submissionsAPI.getById(submissionId);
      setSubmission(subRes.data);
      if (subRes.data.has_evaluation) {
        const evalRes = await evaluationsAPI.getReport(submissionId);
        setEvaluation(evalRes.data);
        setTeacherMarks(
          evalRes.data.teacher_marks !== null ? evalRes.data.teacher_marks : evalRes.data.ai_marks
        );
      }
    } catch (err) {
      console.error('Failed to load evaluation details:', err);
      setError('Failed to fetch submission details from server.');
    } finally {
      setLoading(false);
    }
  };

  const runAIEvaluation = async () => {
    try {
      setEvaluating(true);
      setError('');
      const res = await evaluationsAPI.evaluate(submissionId);
      setEvaluation(res.data);
      setTeacherMarks(res.data.ai_marks);
      setSubmission(prev => ({ ...prev, has_evaluation: true, evaluation_status: 'PENDING' }));
    } catch (err) {
      console.error('AI evaluation run failed:', err);
      setError(err.response?.data?.detail || 'Google Gemini AI evaluation failed. Check key config or try again.');
    } finally {
      setEvaluating(false);
    }
  };

  useEffect(() => { loadData(); }, [submissionId]);
  useEffect(() => {
    if (!loading && autoTrigger && submission && !submission.has_evaluation && !evaluating) {
      runAIEvaluation();
    }
  }, [loading, autoTrigger, submission]);

  const handlePublish = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (teacherMarks === '') { setError('Please input the final marks to publish.'); return; }
    const marksNum = parseFloat(teacherMarks);
    if (isNaN(marksNum) || marksNum < 0 || marksNum > submission.total_marks) {
      setError(`Marks must be between 0 and ${submission.total_marks}.`);
      return;
    }
    setPublishLoading(true);
    try {
      const res = await evaluationsAPI.publish(submissionId, marksNum);
      setEvaluation(res.data);
      setSuccess('Evaluation marks published successfully. Student has been notified.');
      const updatedSub = await submissionsAPI.getById(submissionId);
      setSubmission(updatedSub);
      // Signal teacher dashboard to refresh its analytics
      window.dispatchEvent(new CustomEvent('dashboardRefresh'));
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to publish marks.');
    } finally {
      setPublishLoading(false);
    }
  };

  const handlePrint = () => window.print();

  if (loading) return <div className="loading-container">Loading Evaluation Details...</div>;

  const scorePercent = evaluation
    ? Math.round((evaluation.ai_marks / submission.total_marks) * 100)
    : 0;

  const sections = [
    { id: 'summary', label: 'Summary' },
    { id: 'metrics', label: 'Performance' },
    { id: 'feedback', label: 'AI Feedback' },
    { id: 'response', label: 'Response Sheet' },
    { id: 'review', label: 'Teacher Review' },
  ];

  return (
    <div className="ed-root animate-fade-in">

      {/* ── Floating AI Loader ── */}
      {evaluating && (
        <div className="ed-overlay">
          <GlassCard className="ed-loader-card">
            <div className="spinner" />
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px' }}>Gemini AI is Evaluating…</h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '260px' }}>
              Comparing student answers with assignment rubrics, calculating accuracy and completeness.
            </p>
          </GlassCard>
        </div>
      )}

      {/* ── Action Bar (no-print) ── */}
      <div className="ed-topbar no-print">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/teacher/submissions')}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="ed-topbar-info">
          <div className="ed-student-chip">
            <div className="ed-chip-avatar">{submission.student_name?.charAt(0)?.toUpperCase()}</div>
            <div>
              <div className="ed-chip-name">{submission.student_name}</div>
              <div className="ed-chip-meta">{submission.assignment_subject} · {submission.assignment_title}</div>
            </div>
          </div>
        </div>

        <div className="ed-topbar-actions">
          {!submission.has_evaluation && (
            <button className="btn btn-primary btn-sm" onClick={runAIEvaluation} disabled={evaluating}>
              ✦ Run AI Evaluation
            </button>
          )}
          {evaluation && (
            <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export PDF
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-alert no-print">{error}</div>}
      {success && <div className="success-alert no-print">{success}</div>}

      {/* ── No Evaluation State ── */}
      {!submission.has_evaluation && (
        <GlassCard className="ed-no-eval no-print">
          <div className="ed-no-eval-icon">✦</div>
          <h3>AI Evaluation Not Yet Run</h3>
          <p>Click "Run AI Evaluation" above to generate a Gemini-powered assessment of this submission.</p>
        </GlassCard>
      )}

      {/* ─────────────── REPORT (5 sections) ─────────────── */}
      {evaluation && (
        <div className="ed-report">

          {/* Print-only report header */}
          <div className="print-header">
            <div className="ph-brand">
              <span className="ph-brand-name">INTELLIGRADE</span>
              <span className="ph-brand-tag">AI Evaluation Report</span>
            </div>
            <div className="ph-meta">
              <div><strong>Student:</strong> {submission.student_name}</div>
              <div><strong>Assignment:</strong> {submission.assignment_title}</div>
              <div><strong>Subject:</strong> {submission.assignment_subject}</div>
              <div><strong>Submitted:</strong> {new Date(submission.submitted_at).toLocaleDateString()}</div>
              <div><strong>Total Marks:</strong> {submission.total_marks}</div>
              <div><strong>Grade:</strong> {evaluation.grade}</div>
            </div>
          </div>

          {/* Section tab nav (no-print) */}
          <div className="ed-tabs no-print">
            {sections.map(s => (
              <button
                key={s.id}
                className={`ed-tab ${activeSection === s.id ? 'active' : ''}`}
                onClick={() => setActiveSection(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* ──────── Section 1: Evaluation Summary ──────── */}
          <section
            className={`ed-section ${activeSection === 'summary' ? 'active' : ''} print-section`}
            data-section="summary"
          >
            <div className="ed-section-label">Section 1 / Evaluation Summary</div>
            <div className="ed-summary-grid">
              {/* Score ring */}
              <GlassCard className="ed-score-card">
                <div style={{ position: 'relative', width: 120, height: 120 }}>
                  <CircleProgress value={scorePercent} size={120} stroke={8} color="var(--secondary)" />
                  <div className="ed-ring-center">
                    <span className="ed-ring-val">{evaluation.ai_marks}</span>
                    <span className="ed-ring-max">/{submission.total_marks}</span>
                  </div>
                </div>
                <div className="ed-score-meta">
                  <div className="ed-score-pct">{scorePercent}%</div>
                  <div className="ed-score-lbl">AI Score</div>
                  <GradeBadge grade={evaluation.grade} />
                </div>
              </GlassCard>

              {/* Details table */}
              <GlassCard className="ed-details-card">
                <div className="ed-details-title">Submission Details</div>
                <div className="ed-details-grid">
                  <div className="ed-detail-row">
                    <span className="ed-detail-key">Student</span>
                    <span className="ed-detail-val">{submission.student_name}</span>
                  </div>
                  <div className="ed-detail-row">
                    <span className="ed-detail-key">Assignment</span>
                    <span className="ed-detail-val">{submission.assignment_title}</span>
                  </div>
                  <div className="ed-detail-row">
                    <span className="ed-detail-key">Subject</span>
                    <span className="ed-detail-val">{submission.assignment_subject}</span>
                  </div>
                  <div className="ed-detail-row">
                    <span className="ed-detail-key">Submitted</span>
                    <span className="ed-detail-val">{new Date(submission.submitted_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</span>
                  </div>
                  <div className="ed-detail-row">
                    <span className="ed-detail-key">Total Marks</span>
                    <span className="ed-detail-val">{submission.total_marks}</span>
                  </div>
                  <div className="ed-detail-row">
                    <span className="ed-detail-key">AI Recommend</span>
                    <span className="ed-detail-val" style={{ color: 'var(--secondary)', fontWeight: 700 }}>{evaluation.ai_marks} marks · {evaluation.grade}</span>
                  </div>
                  <div className="ed-detail-row">
                    <span className="ed-detail-key">Status</span>
                    <span className={`status-badge status-${submission.evaluation_status?.toLowerCase()}`}>
                      {submission.evaluation_status || 'PENDING'}
                    </span>
                  </div>
                </div>
              </GlassCard>
            </div>
          </section>

          {/* ──────── Section 2: Performance Metrics ──────── */}
          <section
            className={`ed-section ${activeSection === 'metrics' ? 'active' : ''} print-section`}
            data-section="metrics"
          >
            <div className="ed-section-label">Section 2 / Performance Metrics</div>
            <div className="ed-metrics-wrap">
              {/* Circular Dials */}
              <div className="ed-dials-row">
                {[
                  { label: 'Semantic Accuracy', val: evaluation.accuracy, color: '#6366f1' },
                  { label: 'Completeness', val: evaluation.completeness, color: '#a855f7' },
                  { label: 'Overall Score', val: scorePercent, color: '#10b981' },
                ].map((d, i) => (
                  <GlassCard key={i} className="ed-dial-card">
                    <div style={{ position: 'relative', width: 90, height: 90 }}>
                      <CircleProgress value={d.val} size={90} stroke={7} color={d.color} />
                      <div className="ed-ring-center">
                        <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-display)', color: d.color }}>{d.val}%</span>
                      </div>
                    </div>
                    <div className="ed-dial-label">{d.label}</div>
                  </GlassCard>
                ))}
              </div>

              {/* Linear progress bars */}
              <GlassCard className="ed-bars-card">
                <div className="ed-bars-title">Detailed Score Breakdown</div>
                {[
                  { label: 'Semantic Accuracy', val: evaluation.accuracy, color: '#6366f1' },
                  { label: 'Answer Completeness', val: evaluation.completeness, color: '#a855f7' },
                  { label: 'Overall Performance', val: scorePercent, color: '#10b981' },
                ].map((b, i) => (
                  <div key={i} className="ed-bar-row">
                    <div className="ed-bar-meta">
                      <span className="ed-bar-label">{b.label}</span>
                      <strong style={{ color: b.color }}>{b.val}%</strong>
                    </div>
                    <div className="ed-bar-track">
                      <div className="ed-bar-fill" style={{ width: `${b.val}%`, background: b.color }} />
                    </div>
                  </div>
                ))}
              </GlassCard>
            </div>
          </section>

          {/* ──────── Section 3: AI Feedback ──────── */}
          <section
            className={`ed-section ${activeSection === 'feedback' ? 'active' : ''} print-section`}
            data-section="feedback"
          >
            <div className="ed-section-label">Section 3 / AI Evaluation Feedback</div>

            <GlassCard className="ed-overall-feedback">
              <div className="ed-feedback-header">
                <span className="ed-feedback-icon">✦</span>
                <div>
                  <div className="ed-feedback-title">Overall Assessment</div>
                  <div className="ed-feedback-subtitle">Generated by Google Gemini AI</div>
                </div>
              </div>
              <p className="ed-feedback-body">{evaluation.overall_feedback}</p>
            </GlassCard>

            <div className="ed-quadrant-grid">
              <GlassCard className="ed-quad-card ed-strengths">
                <div className="ed-quad-header">
                  <span className="ed-quad-dot" style={{ background: 'var(--status-success)' }} />
                  Strengths
                </div>
                <ul className="ed-quad-list">
                  {evaluation.strengths?.length > 0
                    ? evaluation.strengths.map((s, i) => <li key={i}>{s}</li>)
                    : <li>No notable strengths highlighted.</li>}
                </ul>
              </GlassCard>

              <GlassCard className="ed-quad-card ed-mistakes">
                <div className="ed-quad-header">
                  <span className="ed-quad-dot" style={{ background: 'var(--status-error)' }} />
                  Mistakes / Gaps
                </div>
                <ul className="ed-quad-list">
                  {evaluation.mistakes?.length > 0
                    ? evaluation.mistakes.map((s, i) => <li key={i}>{s}</li>)
                    : <li>No critical mistakes identified.</li>}
                </ul>
              </GlassCard>

              <GlassCard className="ed-quad-card ed-missing">
                <div className="ed-quad-header">
                  <span className="ed-quad-dot" style={{ background: 'var(--status-warning)' }} />
                  Missing Concepts
                </div>
                <ul className="ed-quad-list">
                  {evaluation.missing_topics?.length > 0
                    ? evaluation.missing_topics.map((s, i) => <li key={i}>{s}</li>)
                    : <li>All required concepts addressed.</li>}
                </ul>
              </GlassCard>

              <GlassCard className="ed-quad-card ed-suggestions">
                <div className="ed-quad-header">
                  <span className="ed-quad-dot" style={{ background: 'var(--primary)' }} />
                  Suggestions
                </div>
                <ul className="ed-quad-list">
                  {evaluation.suggestions?.length > 0
                    ? evaluation.suggestions.map((s, i) => <li key={i}>{s}</li>)
                    : <li>No immediate modifications required.</li>}
                </ul>
              </GlassCard>
            </div>
          </section>

          {/* ──────── Section 4: Student Response Sheet ──────── */}
          <section
            className={`ed-section ${activeSection === 'response' ? 'active' : ''} print-section no-print-hide`}
            data-section="response"
          >
            <div className="ed-section-label">Section 4 / Student Response Sheet</div>
            <GlassCard className="ed-response-card">
              <div className="ed-response-header">
                <div>
                  <div className="ed-response-title">Extracted Answer Text</div>
                  <div className="ed-response-meta">
                    Submitted on {new Date(submission.submitted_at).toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' })}
                    {submission.file_path && (
                      <> · <span style={{ color: 'var(--secondary)' }}>
                        {submission.file_path.split(/[\/\\]/).pop().substring(15) || 'Attachment'}
                      </span></>
                    )}
                  </div>
                </div>
              </div>
              <div className="ed-response-body">
                {submission.extracted_text || '[No readable text found inside uploaded answer file]'}
              </div>
            </GlassCard>
          </section>

          {/* ──────── Section 5: Teacher Review ──────── */}
          <section
            className={`ed-section ${activeSection === 'review' ? 'active' : ''} no-print-hide`}
            data-section="review"
          >
            <div className="ed-section-label">Section 5 / Teacher Review & Publish</div>
            <GlassCard className="ed-review-card">
              <div className="ed-review-header">
                <div>
                  <div className="ed-review-title">Finalize & Publish Grades</div>
                  <p className="ed-review-sub">
                    AI recommends <strong style={{ color: 'var(--secondary)' }}>{evaluation.ai_marks} / {submission.total_marks}</strong> marks.
                    Override below if needed, then publish to student dashboard.
                  </p>
                </div>
                {submission.evaluation_status === 'PUBLISHED' && (
                  <span className="ed-published-badge">✓ Published</span>
                )}
              </div>

              <form onSubmit={handlePublish} className="ed-review-form">
                <div className="form-group">
                  <label className="form-label">Final Published Marks (Max {submission.total_marks})</label>
                  <div className="ed-marks-row">
                    <input
                      type="number"
                      step="0.1"
                      className="glass-input"
                      value={teacherMarks}
                      onChange={e => setTeacherMarks(e.target.value)}
                      max={submission.total_marks}
                      min="0"
                      required
                      disabled={submission.evaluation_status === 'PUBLISHED'}
                      placeholder={`Enter marks (0 – ${submission.total_marks})`}
                      style={{ maxWidth: '260px' }}
                    />
                    <button
                      type="submit"
                      className="btn btn-success btn-md"
                      disabled={publishLoading || submission.evaluation_status === 'PUBLISHED'}
                    >
                      {publishLoading ? 'Publishing…' : submission.evaluation_status === 'PUBLISHED' ? 'Already Published' : 'Publish Result'}
                    </button>
                  </div>
                </div>
              </form>

              {submission.evaluation_status === 'PUBLISHED' && (
                <div className="ed-publish-confirm">
                  ✓ Results published. Marks set to <strong>{evaluation.teacher_marks}/{submission.total_marks}</strong>.
                </div>
              )}
            </GlassCard>
          </section>

        </div> /* end ed-report */
      )}

      {/* ────── STYLES ────── */}
      <style dangerouslySetInnerHTML={{ __html: `
        .ed-root {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* ── Top action bar ── */
        .ed-topbar {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .ed-topbar-info { flex: 1; }

        .ed-topbar-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .ed-student-chip {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ed-chip-avatar {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: var(--gradient-main);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 15px;
          flex-shrink: 0;
        }

        .ed-chip-name {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
          font-family: var(--font-display);
        }

        .ed-chip-meta {
          font-size: 12px;
          color: var(--text-muted);
        }

        /* ── Overlay loader ── */
        .ed-overlay {
          position: fixed;
          inset: 0;
          background: rgba(7,11,26,0.75);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
        }

        .ed-loader-card {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          gap: 16px !important;
          padding: 40px !important;
          max-width: 320px !important;
          text-align: center;
        }

        /* ── No eval state ── */
        .ed-no-eval {
          text-align: center;
          padding: 60px 40px !important;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .ed-no-eval-icon {
          font-size: 36px;
          background: var(--gradient-main);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .ed-no-eval h3 {
          font-size: 18px;
          font-family: var(--font-display);
          color: var(--text-primary);
        }

        .ed-no-eval p {
          font-size: 13px;
          color: var(--text-secondary);
          max-width: 340px;
        }

        /* ── Report wrapper ── */
        .ed-report {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        /* ── Tab navigation ── */
        .ed-tabs {
          display: flex;
          gap: 4px;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 4px;
          width: fit-content;
          flex-wrap: wrap;
        }

        .ed-tab {
          padding: 7px 18px;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 500;
          font-family: var(--font-display);
          border: none;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          outline: none;
        }

        .ed-tab:hover { color: var(--text-primary); }
        .ed-tab.active {
          background: var(--gradient-main);
          color: #ffffff;
          box-shadow: 0 3px 12px rgba(168,85,247,0.35);
        }

        /* ── Sections ── */
        .ed-section {
          display: none;
          flex-direction: column;
          gap: 18px;
        }

        .ed-section.active { display: flex; }

        .ed-section-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
          padding-left: 2px;
        }

        /* ── Section 1: Summary ── */
        .ed-summary-grid {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 18px;
        }

        @media (max-width: 800px) {
          .ed-summary-grid { grid-template-columns: 1fr; }
        }

        .ed-score-card {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 16px !important;
          padding: 32px 24px !important;
          text-align: center;
        }

        .ed-ring-center {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .ed-ring-val {
          font-size: 22px;
          font-weight: 800;
          font-family: var(--font-display);
          color: var(--text-primary);
          line-height: 1;
        }

        .ed-ring-max {
          font-size: 11px;
          color: var(--text-muted);
        }

        .ed-score-meta {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .ed-score-pct {
          font-size: 28px;
          font-weight: 800;
          font-family: var(--font-display);
          background: var(--gradient-main);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .ed-score-lbl {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: -4px;
        }

        .ed-details-card {
          padding: 24px !important;
        }

        .ed-details-title {
          font-size: 14px;
          font-weight: 700;
          font-family: var(--font-display);
          color: var(--text-primary);
          margin-bottom: 16px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--border-color);
        }

        .ed-details-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .ed-detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          font-size: 13px;
          padding: 6px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }

        .ed-detail-row:last-child { border-bottom: none; }

        .ed-detail-key {
          color: var(--text-muted);
          font-size: 12px;
          min-width: 100px;
        }

        .ed-detail-val {
          color: var(--text-primary);
          font-weight: 500;
          text-align: right;
          flex: 1;
        }

        /* ── Section 2: Metrics ── */
        .ed-metrics-wrap {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .ed-dials-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        @media (max-width: 700px) {
          .ed-dials-row { grid-template-columns: repeat(2, 1fr); }
        }

        .ed-dial-card {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          gap: 12px !important;
          padding: 24px 16px !important;
          text-align: center;
        }

        .ed-dial-label {
          font-size: 12.5px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .ed-bars-card { padding: 24px !important; }

        .ed-bars-title {
          font-size: 14px;
          font-weight: 700;
          font-family: var(--font-display);
          color: var(--text-primary);
          margin-bottom: 18px;
        }

        .ed-bar-row { margin-bottom: 16px; }

        .ed-bar-meta {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          margin-bottom: 6px;
        }

        .ed-bar-label { color: var(--text-secondary); }

        .ed-bar-track {
          height: 6px;
          border-radius: 99px;
          background: rgba(255,255,255,0.06);
          overflow: hidden;
        }

        .ed-bar-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.8s ease;
        }

        /* ── Section 3: Feedback ── */
        .ed-overall-feedback {
          padding: 24px !important;
          border-left: 3px solid var(--secondary) !important;
        }

        .ed-feedback-header {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 14px;
        }

        .ed-feedback-icon {
          font-size: 22px;
          background: var(--gradient-main);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          line-height: 1.2;
        }

        .ed-feedback-title {
          font-size: 15px;
          font-weight: 700;
          font-family: var(--font-display);
          color: var(--text-primary);
        }

        .ed-feedback-subtitle {
          font-size: 12px;
          color: var(--text-muted);
        }

        .ed-feedback-body {
          font-size: 13.5px;
          line-height: 1.65;
          color: var(--text-secondary);
        }

        .ed-quadrant-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        @media (max-width: 700px) {
          .ed-quadrant-grid { grid-template-columns: 1fr; }
        }

        .ed-quad-card { padding: 18px !important; }

        .ed-quad-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13.5px;
          font-weight: 700;
          font-family: var(--font-display);
          margin-bottom: 12px;
          color: var(--text-primary);
        }

        .ed-quad-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .ed-quad-list {
          padding-left: 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 12.5px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        /* ── Section 4: Response Sheet ── */
        .ed-response-card { padding: 24px !important; }

        .ed-response-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--border-color);
        }

        .ed-response-title {
          font-size: 14px;
          font-weight: 700;
          font-family: var(--font-display);
          color: var(--text-primary);
        }

        .ed-response-meta { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

        .ed-response-body {
          font-size: 13.5px;
          line-height: 1.7;
          color: var(--text-secondary);
          white-space: pre-wrap;
          background: rgba(0,0,0,0.2);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 18px;
          max-height: 520px;
          overflow-y: auto;
          font-family: var(--font-sans);
        }

        /* ── Section 5: Teacher Review ── */
        .ed-review-card { padding: 28px !important; }

        .ed-review-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 22px;
          padding-bottom: 18px;
          border-bottom: 1px solid var(--border-color);
        }

        .ed-review-title {
          font-size: 16px;
          font-weight: 700;
          font-family: var(--font-display);
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        .ed-review-sub {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .ed-published-badge {
          background: rgba(16,185,129,0.1);
          border: 1.5px solid var(--status-success);
          color: var(--status-success);
          font-size: 12px;
          font-weight: 700;
          padding: 4px 14px;
          border-radius: 20px;
          white-space: nowrap;
        }

        .ed-review-form { display: flex; flex-direction: column; gap: 16px; }

        .ed-marks-row {
          display: flex;
          align-items: flex-end;
          gap: 14px;
          flex-wrap: wrap;
        }

        .ed-publish-confirm {
          margin-top: 14px;
          font-size: 13px;
          font-weight: 600;
          color: var(--status-success);
          padding: 10px 14px;
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.2);
          border-radius: 8px;
        }

        /* ═══════════════ PRINT / PDF EXPORT ═══════════════ */
        .print-header { display: none; }

        @media print {
          .no-print,
          .ed-topbar,
          .ed-tabs,
          .no-print-hide { display: none !important; }

          @page { size: A4 portrait; margin: 18mm 15mm; }

          html, body {
            background: #ffffff !important;
            color: #111827 !important;
            font-size: 11pt;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .sidebar { display: none !important; }
          header.navbar { display: none !important; }

          .ed-section {
            display: flex !important;
            flex-direction: column;
            gap: 16px;
            page-break-inside: avoid;
            margin-bottom: 20px;
          }

          .ed-section-label { display: block !important; }

          .print-header {
            display: block !important;
            text-align: center;
            margin-bottom: 24px;
            padding-bottom: 14px;
            border-bottom: 2px solid #1e3a8a;
          }

          .ph-brand { margin-bottom: 8px; }

          .ph-brand-name {
            display: block;
            font-size: 20pt;
            font-weight: 900;
            letter-spacing: 0.06em;
            color: #1e3a8a !important;
          }

          .ph-brand-tag {
            font-size: 10pt;
            color: #6b7280;
            letter-spacing: 0.04em;
            text-transform: uppercase;
          }

          .ph-meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px 20px;
            font-size: 10pt;
            color: #374151;
            text-align: left;
            margin-top: 10px;
          }

          .glass-card, .ed-score-card, .ed-details-card, .ed-bars-card,
          .ed-overall-feedback, .ed-quad-card, .ed-response-card, .ed-review-card {
            background: #f9fafb !important;
            border: 1px solid #e5e7eb !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
          }

          .ed-summary-grid { grid-template-columns: 200px 1fr; }
          .ed-dials-row { grid-template-columns: repeat(3, 1fr); }
          .ed-quadrant-grid { grid-template-columns: 1fr 1fr; }

          .ed-score-pct, .ed-feedback-icon { -webkit-text-fill-color: #1e3a8a !important; }
          .ed-details-title, .ed-bars-title, .ed-feedback-title, .ed-quad-header,
          .ed-response-title, .ed-review-title, .ed-chip-name, .ed-section-label {
            color: #111827 !important;
          }

          .ed-detail-key, .ed-response-meta, .ed-feedback-subtitle { color: #6b7280 !important; }
          .ed-detail-val, .ed-feedback-body, .ed-quad-list, .ed-response-body { color: #374151 !important; }

          .ed-bar-track { background: #e5e7eb !important; }

          .status-badge { background: #e0e7ff !important; color: #1e3a8a !important; }
        }
      `}} />
    </div>
  );
};

export default EvaluationDetail;
