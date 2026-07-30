import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { assignmentsAPI } from '../../services/api';
import GlassCard from '../../components/GlassCard';

const UploadAssignment = () => {
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [department, setDepartment] = useState('');
  const [semester, setSemester] = useState('');
  const [description, setDescription] = useState('');
  const [totalMarks, setTotalMarks] = useState(100);
  const [dueDate, setDueDate] = useState('');
  const [questionsText, setQuestionsText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['pdf', 'docx', 'txt'].includes(ext)) {
        setError("Only PDF, DOCX, and TXT files are allowed for upload.");
        setSelectedFile(null);
        return;
      }
      setError('');
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title || !subject || !department || !semester || !totalMarks || !dueDate) {
      setError("Please fill in all mandatory fields (Title, Subject, Department, Semester, Total Marks, Due Date).");
      return;
    }

    if (!questionsText && !selectedFile) {
      setError("Please provide assignment questions, either by typing them in the text area or uploading an attachment (PDF/DOCX/TXT).");
      return;
    }

    setLoading(true);
    setUploadProgress(10);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('subject', subject);
    formData.append('department', department);
    formData.append('semester', semester);
    formData.append('description', description);
    formData.append('total_marks', totalMarks);
    formData.append('due_date', dueDate);
    formData.append('questions', questionsText);
    if (selectedFile) {
      formData.append('file', selectedFile);
    }

    try {
      // Simulate fake progress bar for premium UI experience
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 80) {
            clearInterval(interval);
            return 80;
          }
          return prev + 15;
        });
      }, 100);

      await assignmentsAPI.create(formData);
      
      clearInterval(interval);
      setUploadProgress(100);
      setSuccess("Assignment successfully uploaded and published to database.");
      
      setTimeout(() => {
        navigate('/teacher/dashboard');
      }, 1500);

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to create assignment. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="upload-assignment animate-fade-in">
      <div className="section-header">
        <p className="section-subtitle">Distribute course assignments to enrolled students and configure evaluation parameters.</p>
      </div>

      {loading && (
        <div className="progress-overlay flex-center">
          <GlassCard className="progress-card flex-center" style={{ flexDirection: 'column', gap: '15px' }}>
            <div className="spinner"></div>
            <h3>Uploading Assignment Details</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Extracting attachment questions and seeding DB...</p>
            <div className="progress-bar-container" style={{ width: '220px', marginTop: '10px' }}>
              <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }}></div>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600 }}>{uploadProgress}%</span>
          </GlassCard>
        </div>
      )}

      <div className="upload-grid">
        <GlassCard className="form-card">
          {error && <div className="error-alert">{error}</div>}
          {success && <div className="success-alert">{success}</div>}

          <form onSubmit={handleSubmit} className="upload-form">
            <div className="form-row two-col">
              <div className="form-group">
                <label>Assignment Title *</label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="e.g. Midterm Programming Project"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Subject *</label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="e.g. Advanced Software Engineering"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row three-col">
              <div className="form-group">
                <label>Department *</label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="e.g. Computer Science"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Semester / Term *</label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="e.g. Fall 2026"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Total Evaluation Marks *</label>
                <input
                  type="number"
                  className="glass-input"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(parseInt(e.target.value) || 0)}
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Due Date & Time *</label>
              <input
                type="datetime-local"
                className="glass-input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Assignment Overview & Instructions</label>
              <textarea
                className="glass-input textarea"
                placeholder="Describe assignment scope, rules, and guidelines for students..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>Assignment Questions (Write Text)</label>
              <textarea
                className="glass-input textarea code-font"
                placeholder="Type assignment questions here sequentially..."
                value={questionsText}
                onChange={(e) => setQuestionsText(e.target.value)}
                rows="6"
              />
            </div>

            <div className="form-group">
              <label>Or Attach Questions Document (PDF / DOCX / TXT)</label>
              <div 
                className={`file-drop-zone ${selectedFile ? 'has-file' : ''}`}
                onClick={() => fileInputRef.current.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.txt"
                />
                <svg className="w-10 h-10 drop-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {selectedFile ? (
                  <div className="selected-file-details">
                    <span className="file-name">{selectedFile.name}</span>
                    <span className="file-size">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                ) : (
                  <div className="drop-zone-text">
                    <span>Click or Drag assignment sheet file to upload</span>
                    <span className="file-formats">Supports PDF, Word (DOCX) or plain Text files</span>
                  </div>
                )}
              </div>
            </div>

            <div className="form-buttons flex-between">
              <button type="button" className="btn btn-secondary btn-md" onClick={() => navigate('/teacher/dashboard')}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-md">
                Publish Assignment
              </button>
            </div>
          </form>
        </GlassCard>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .upload-assignment {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .upload-grid {
          max-width: 900px;
          margin: 0 auto;
          width: 100%;
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

        .form-card {
          padding: 30px !important;
        }

        .upload-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-row {
          display: grid;
          gap: 20px;
        }

        .two-col {
          grid-template-columns: 1fr 1fr;
        }

        .three-col {
          grid-template-columns: 1.2fr 1fr 0.8fr;
        }

        @media (max-width: 600px) {
          .two-col, .three-col {
            grid-template-columns: 1fr;
          }
        }

        .glass-input.textarea {
          resize: vertical;
          font-family: var(--font-sans);
        }

        .glass-input.code-font {
          font-family: monospace;
          background: rgba(0, 0, 0, 0.15);
        }

        .light-theme .glass-input.code-font {
          background: rgba(0, 0, 0, 0.03);
        }

        .file-drop-zone {
          border: 2px dashed var(--border-color);
          border-radius: var(--border-radius-sm);
          padding: 24px;
          text-align: center;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.01);
          transition: all 0.3s ease;
        }

        .light-theme .file-drop-zone {
          background: rgba(0, 0, 0, 0.01);
        }

        .file-drop-zone:hover {
          border-color: var(--secondary);
          background: rgba(168, 85, 247, 0.04);
        }

        .file-drop-zone.has-file {
          border-color: var(--status-success);
          background: rgba(16, 185, 129, 0.04);
        }

        .drop-icon {
          color: var(--text-muted);
          width: 40px;
          height: 40px;
        }

        .file-drop-zone:hover .drop-icon {
          color: var(--secondary);
        }

        .drop-zone-text span {
          display: block;
          font-size: 13.5px;
        }

        .file-formats {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 4px;
        }

        .selected-file-details {
          display: flex;
          flex-direction: column;
          font-weight: 500;
        }

        .file-name {
          font-size: 14px;
          color: var(--text-primary);
        }

        .file-size {
          font-size: 11px;
          color: var(--text-muted);
        }

        .error-alert {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          border-radius: var(--border-radius-sm);
          padding: 12px;
          font-size: 13.5px;
          margin-bottom: 20px;
          text-align: center;
        }

        .success-alert {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #34d399;
          border-radius: var(--border-radius-sm);
          padding: 12px;
          font-size: 13.5px;
          margin-bottom: 20px;
          text-align: center;
        }

        .progress-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(5, 4, 15, 0.8);
          z-index: 999;
        }

        .progress-card {
          width: 320px;
          text-align: center;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid var(--border-color);
          border-top: 4px solid var(--secondary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
};

export default UploadAssignment;
