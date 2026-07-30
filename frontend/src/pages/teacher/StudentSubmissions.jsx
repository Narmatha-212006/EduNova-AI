import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { submissionsAPI, assignmentsAPI } from '../../services/api';
import GlassCard from '../../components/GlassCard';

const StudentSubmissions = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [assignments, setAssignments] = useState([]);
  
  // Filter settings
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [searchStudent, setSearchStudent] = useState('');
  const [loading, setLoading] = useState(true);

  const loadFilterData = async () => {
    try {
      const res = await assignmentsAPI.getAll();
      setAssignments(res.data);
    } catch (err) {
      console.error("Failed to load assignments filter list:", err);
    }
  };

  const loadSubmissionsData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedAssignment) params.assignment_id = selectedAssignment;
      if (searchStudent) params.search_student = searchStudent;

      const res = await submissionsAPI.listTeacherSubmissions(params);
      setSubmissions(res.data);
    } catch (err) {
      console.error("Failed to query student submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilterData();
  }, []);

  useEffect(() => {
    loadSubmissionsData();
  }, [selectedAssignment, searchStudent]);

  const handleAIEvaluate = (submissionId) => {
    // Forward to evaluation page with auto-trigger evaluation query parameter
    navigate(`/teacher/evaluation/${submissionId}?trigger=true`);
  };

  return (
    <div className="student-submissions animate-fade-in">
      <div className="section-header">
        <p className="section-subtitle">Review files uploaded by students, trigger Gemini AI scoring, and manage report publications.</p>
      </div>

      {/* Filter panel */}
      <GlassCard className="filters-card">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Filter by Assignment</label>
            <select
              className="glass-input select-theme"
              value={selectedAssignment}
              onChange={(e) => setSelectedAssignment(e.target.value)}
            >
              <option value="">All Assignments</option>
              {assignments.map((ass) => (
                <option key={ass.id} value={ass.id}>
                  {ass.title} ({ass.subject})
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Search Student Name</label>
            <input
              type="text"
              className="glass-input"
              placeholder="e.g. Connor"
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
            />
          </div>
        </div>
      </GlassCard>

      {/* Submissions Table card */}
      <GlassCard className="table-card">
        <div className="table-container">
          {loading ? (
            <div className="table-loader flex-center">Loading Submissions List...</div>
          ) : submissions.length === 0 ? (
            <div className="empty-table-state text-center">
              No submissions match the filter criteria.
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Assignment Title</th>
                  <th>Subject</th>
                  <th>Date Submitted</th>
                  <th>Status</th>
                  <th style={{textAlign:'center'}}>Score / Grade</th>
                  <th style={{textAlign:'center'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr key={sub.id}>
                    <td style={{ fontWeight: 600 }}>{sub.student_name}</td>
                    <td>{sub.assignment_title}</td>
                    <td>{sub.assignment_subject}</td>
                    <td>
                      {new Date(sub.submitted_at).toLocaleDateString()} at {new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      {!sub.has_evaluation && <span className="badge badge-pending">Unevaluated</span>}
                      {sub.has_evaluation && sub.evaluation_status === 'PENDING' && <span className="badge badge-evaluated">Draft Mode</span>}
                      {sub.has_evaluation && sub.evaluation_status === 'PUBLISHED' && <span className="badge badge-published">Published</span>}
                    </td>
                    <td style={{textAlign:'center', verticalAlign:'middle'}}>
                      {sub.final_marks !== null ? (
                        <div className="score-cell">
                          <strong>{sub.final_marks}</strong><span style={{color:'var(--text-muted)'}}>&nbsp;/&nbsp;{sub.total_marks}</span>
                          <span className="grade-pill">{sub.grade}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{textAlign:'center', verticalAlign:'middle'}}>
                      <div className="table-actions">
                        {!sub.has_evaluation ? (
                          <button className="action-btn action-btn-success" onClick={() => handleAIEvaluate(sub.id)}>
                            ⚡ AI Evaluate
                          </button>
                        ) : (
                          <Link to={`/teacher/evaluation/${sub.id}`} className="action-btn action-btn-primary">
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

      <style dangerouslySetInnerHTML={{__html: `
        .student-submissions {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .section-header h2 {
          font-size: 24px;
          font-family: var(--font-display);
          font-weight: 700;
        }

        .section-header p {
          color: var(--text-secondary);
          font-size: 13.5px;
          margin-top: 4px;
        }

        .filters-card {
          padding: 18px 24px !important;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 20px;
        }

        @media (max-width: 768px) {
          .filters-grid {
            grid-template-columns: 1fr;
          }
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-group label {
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .select-theme {
          background: rgba(255, 255, 255, 0.03);
          cursor: pointer;
        }

        .light-theme .select-theme {
          background: rgba(0, 0, 0, 0.02);
        }

        .select-theme option {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .table-card {
          padding: 16px !important;
        }

        .table-loader {
          height: 150px;
          font-size: 14px;
          color: var(--text-secondary);
        }

        .empty-table-state {
          padding: 50px 20px;
          color: var(--text-muted);
          font-size: 14px;
        }

        .score-cell {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          white-space: nowrap;
        }

        .grade-pill {
          background: var(--gradient-main);
          color: #ffffff;
          padding: 2px 8px;
          font-size: 11px;
          border-radius: 4px;
          font-weight: 700;
          display: inline-block;
        }

        .table-actions {
          display: flex;
          justify-content: center;
          gap: 8px;
        }

        /* Uniform action buttons */
        .action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          outline: none;
          white-space: nowrap;
          text-decoration: none;
          height: 32px;
          min-width: 120px;
          transition: all 0.2s ease;
        }

        .action-btn-primary {
          background: var(--gradient-main);
          color: #fff;
          box-shadow: 0 2px 8px rgba(124, 58, 237, 0.2);
        }

        .action-btn-primary:hover {
          filter: brightness(1.1);
          box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4);
        }

        .action-btn-success {
          background: var(--status-success);
          color: #fff;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
        }

        .action-btn-success:hover {
          filter: brightness(1.1);
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
        }

        @media (max-width: 900px) {
          .action-btn { min-width: 90px; font-size: 11px; padding: 5px 10px; }
        }
      `}} />
    </div>
  );
};

export default StudentSubmissions;
