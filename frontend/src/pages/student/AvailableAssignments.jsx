import React, { useState, useEffect, useRef } from 'react';
import { assignmentsAPI, submissionsAPI } from '../../services/api';
import GlassCard from '../../components/GlassCard';

const AvailableAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMsg, setUploadMsg] = useState({ type: '', text: '' });
  const [submittedIds, setSubmittedIds] = useState(new Set());
  const fileRef = useRef(null);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      const res = await assignmentsAPI.getAll(params);
      setAssignments(res.data);

      // Check which ones are already submitted
      const submitted = new Set();
      for (const a of res.data) {
        try {
          await submissionsAPI.getStudentSubmission(a.id);
          submitted.add(a.id);
        } catch (err) {
          // Not submitted - that's fine
        }
      }
      setSubmittedIds(submitted);
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [search]);

  const openUpload = (assignment) => {
    setSelectedAssignment(assignment);
    setUploadFile(null);
    setUploadMsg({ type: '', text: '' });
    setUploadProgress(0);
    setShowUploadModal(true);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['pdf', 'docx', 'txt'].includes(ext)) {
        setUploadMsg({ type: 'error', text: 'Only PDF, DOCX, and TXT files are allowed.' });
        setUploadFile(null);
        return;
      }
      setUploadMsg({ type: '', text: '' });
      setUploadFile(file);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!uploadFile) {
      setUploadMsg({ type: 'error', text: 'Please select a file to upload.' });
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    const formData = new FormData();
    formData.append('assignment_id', selectedAssignment.id);
    formData.append('file', uploadFile);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 85) { clearInterval(interval); return 85; }
        return prev + 12;
      });
    }, 150);

    try {
      await submissionsAPI.submit(formData);
      clearInterval(interval);
      setUploadProgress(100);
      setUploadMsg({ type: 'success', text: 'Answer submitted successfully! Your teacher will evaluate it soon.' });
      setSubmittedIds(prev => new Set([...prev, selectedAssignment.id]));
      setTimeout(() => setShowUploadModal(false), 2000);
    } catch (err) {
      clearInterval(interval);
      console.error(err);
      setUploadMsg({ type: 'error', text: err.response?.data?.detail || 'Submission failed. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  const isOverdue = (dueDate) => new Date(dueDate) < new Date();
  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="available-assignments animate-fade-in">
      <div className="section-header">
        <p className="section-subtitle">Browse published assignments, review questions, and submit your answers.</p>
      </div>

      {/* Search Bar */}
      <GlassCard className="search-bar-card">
        <div className="search-row">
          <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            className="glass-input search-input"
            placeholder="Search by title, subject, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </GlassCard>

      {/* Assignments Grid */}
      {loading ? (
        <div className="loading-container">Loading Assignments...</div>
      ) : assignments.length === 0 ? (
        <GlassCard>
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            No assignments found. Check back later or adjust your search.
          </div>
        </GlassCard>
      ) : (
        <div className="assignments-grid">
          {assignments.map(a => {
            const overdue = isOverdue(a.due_date);
            const alreadySubmitted = submittedIds.has(a.id);
            return (
              <GlassCard key={a.id} className={`assignment-card ${overdue ? 'overdue' : ''}`}>
                <div className="card-top">
                  <span className="subject-tag">{a.subject}</span>
                  {overdue && <span className="overdue-tag">Deadline Passed</span>}
                  {alreadySubmitted && <span className="submitted-tag">✓ Submitted</span>}
                </div>
                <h3 className="card-title">{a.title}</h3>
                <p className="card-desc">{a.description || 'No additional description provided.'}</p>
                <div className="card-meta">
                  <span>📅 Due: {formatDate(a.due_date)}</span>
                  <span>📝 {a.total_marks} marks</span>
                </div>
                <div className="card-meta">
                  <span>🏢 {a.department}</span>
                  <span>📆 {a.semester}</span>
                </div>
                <div className="card-actions">
                  {alreadySubmitted ? (
                    <button className="btn btn-secondary btn-md" disabled style={{ opacity: 0.6 }}>Already Submitted</button>
                  ) : (
                    <button className="btn btn-primary btn-md" onClick={() => openUpload(a)}>
                      Upload My Answer
                    </button>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && selectedAssignment && (
        <div className="modal-overlay" onClick={() => !uploading && setShowUploadModal(false)}>
          <div className="modal-content glass-card animate-fade-in" onClick={e => e.stopPropagation()}>
            <h3>Submit Answer for: <span className="text-gradient">{selectedAssignment.title}</span></h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {selectedAssignment.subject} · {selectedAssignment.total_marks} marks · Due {formatDate(selectedAssignment.due_date)}
            </p>

            {uploadMsg.text && (
              <div className={uploadMsg.type === 'success' ? 'success-alert' : 'error-alert'} style={{ marginTop: '16px' }}>
                {uploadMsg.text}
              </div>
            )}

            <div className="upload-zone" onClick={() => fileRef.current?.click()} style={{ marginTop: '20px' }}>
              <input type="file" ref={fileRef} style={{ display: 'none' }} onChange={handleFileSelect} accept=".pdf,.docx,.txt" />
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-muted)', width: '40px', height: '40px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {uploadFile ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{uploadFile.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({(uploadFile.size / 1024).toFixed(1)} KB)</div>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '13.5px' }}>Click to select your answer file</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Supports PDF, DOCX, TXT</div>
                </div>
              )}
            </div>

            {uploading && (
              <div style={{ marginTop: '16px' }}>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${uploadProgress}%`, transition: 'width 0.3s ease' }}></div>
                </div>
                <div style={{ textAlign: 'center', fontSize: '12px', marginTop: '6px', fontWeight: 600 }}>{uploadProgress}%</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-md" onClick={() => setShowUploadModal(false)} disabled={uploading}>Cancel</button>
              <button className="btn btn-primary btn-md" onClick={handleSubmitAnswer} disabled={uploading || !uploadFile}>
                {uploading ? 'Submitting...' : 'Submit Answer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .available-assignments { display: flex; flex-direction: column; gap: 24px; }
        .section-header h2 { font-size: 24px; font-family: var(--font-display); font-weight: 700; }
        .section-header p { color: var(--text-secondary); font-size: 13.5px; margin-top: 4px; }

        .search-bar-card { padding: 14px 20px !important; }
        .search-row { display: flex; align-items: center; gap: 12px; }
        .search-icon { width: 20px; height: 20px; color: var(--text-muted); flex-shrink: 0; }
        .search-input { border: none !important; background: transparent !important; box-shadow: none !important; padding: 6px 0 !important; }

        .assignments-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 20px;
        }

        .assignment-card { display: flex; flex-direction: column; gap: 12px; }
        .assignment-card.overdue { opacity: 0.7; }

        .card-top { display: flex; gap: 8px; flex-wrap: wrap; }
        .subject-tag {
          background: rgba(168,85,247,0.1); color: var(--secondary);
          padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
        }
        .overdue-tag {
          background: rgba(239,68,68,0.1); color: var(--status-error);
          padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
        }
        .submitted-tag {
          background: rgba(16,185,129,0.1); color: var(--status-success);
          padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
        }

        .card-title { font-size: 17px; font-family: var(--font-display); font-weight: 600; }
        .card-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.5; flex: 1; }
        .card-meta { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); }
        .card-actions { margin-top: 4px; }

        .modal-overlay {
          position: fixed; top: 0; left: 0;
          width: 100vw; height: 100vh;
          background: rgba(5,4,15,0.8);
          z-index: 999;
          display: flex; justify-content: center; align-items: center;
          padding: 20px;
        }
        .modal-content {
          width: 100%; max-width: 500px;
          padding: 30px !important;
        }

        .upload-zone {
          border: 2px dashed var(--border-color);
          border-radius: var(--border-radius-sm);
          padding: 30px;
          display: flex; flex-direction: column; align-items: center; gap: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .upload-zone:hover {
          border-color: var(--secondary);
          background: rgba(168,85,247,0.04);
        }

        .loading-container {
          display: flex; justify-content: center; align-items: center;
          height: 40vh; font-size: 16px; font-family: var(--font-display); color: var(--text-secondary);
        }

        .success-alert { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); color: #34d399; border-radius: 8px; padding: 10px; font-size: 13px; }
        .error-alert { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #f87171; border-radius: 8px; padding: 10px; font-size: 13px; }
      `}} />
    </div>
  );
};

export default AvailableAssignments;
