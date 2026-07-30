import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import GlassCard from '../../components/GlassCard';
import { authAPI } from '../../services/api';

const ProfileSettings = () => {
  const { user, updateProfile, resetPassword, toggleTheme, theme } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [pwdMsg, setPwdMsg] = useState({ type: '', text: '' });
  const [logs, setLogs] = useState([]);
  const [logsLoaded, setLogsLoaded] = useState(false);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileMsg({ type: '', text: '' });
    const result = await updateProfile(name, email);
    if (result.success) {
      setProfileMsg({ type: 'success', text: 'Profile information updated successfully.' });
    } else {
      setProfileMsg({ type: 'error', text: result.error });
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setPwdMsg({ type: '', text: '' });
    if (!oldPassword || !newPassword || !confirmNewPassword) {
      setPwdMsg({ type: 'error', text: 'All password fields are required.' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwdMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setPwdMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    const result = await resetPassword(oldPassword, newPassword);
    if (result.success) {
      setPwdMsg({ type: 'success', text: 'Password changed successfully.' });
      setOldPassword(''); setNewPassword(''); setConfirmNewPassword('');
    } else {
      setPwdMsg({ type: 'error', text: result.error });
    }
  };

  const loadActivityLogs = async () => {
    if (logsLoaded) return;
    try {
      const res = await authAPI.getLogs();
      setLogs(res.data);
      setLogsLoaded(true);
    } catch (err) {
      console.error('Failed to load logs:', err);
    }
  };

  return (
    <div className="profile-settings animate-fade-in">
      <div className="section-header">
        <p className="section-subtitle">Manage your academic account credentials and personal preferences.</p>
      </div>

      <div className="settings-grid">
        {/* Left Column */}
        <div className="settings-col">
          {/* Profile Card */}
          <GlassCard>
            <div className="settings-card-header">
              <div className="profile-avatar-large">
                {user?.name ? user.name.substring(0, 2).toUpperCase() : 'NA'}
              </div>
              <div>
                <h3>{user?.name}</h3>
                <p className="role-label">{user?.role === 'teacher' ? '🎓 Faculty Member' : '📚 Student Account'}</p>
                <p className="email-label">{user?.email}</p>
              </div>
            </div>

            <form onSubmit={handleProfileUpdate} className="settings-form">
              <h4 className="form-section-title">Personal Information</h4>

              {profileMsg.text && (
                <div className={profileMsg.type === 'success' ? 'success-alert' : 'error-alert'}>
                  {profileMsg.text}
                </div>
              )}

              <div className="form-group">
                <label>Full Name</label>
                <input type="text" className="glass-input" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" className="glass-input" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Account Role</label>
                <input type="text" className="glass-input" value={user?.role === 'teacher' ? 'Teacher / Faculty' : 'Student'} disabled />
              </div>
              <button type="submit" className="btn btn-primary">Save Profile Changes</button>
            </form>
          </GlassCard>

          {/* Appearance Card */}
          <GlassCard>
            <h4 className="form-section-title">Appearance & Display</h4>
            <div className="theme-toggle-row">
              <div>
                <p className="toggle-label">Color Theme</p>
                <p className="toggle-desc">Currently using <strong>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</strong></p>
              </div>
              <button className="btn btn-secondary theme-btn" onClick={toggleTheme}>
                {theme === 'dark' ? '☀️ Switch to Light' : '🌙 Switch to Dark'}
              </button>
            </div>
          </GlassCard>
        </div>

        {/* Right Column */}
        <div className="settings-col">
          {/* Password Reset Card */}
          <GlassCard>
            <form onSubmit={handlePasswordReset} className="settings-form">
              <h4 className="form-section-title">Change Password</h4>

              {pwdMsg.text && (
                <div className={pwdMsg.type === 'success' ? 'success-alert' : 'error-alert'}>
                  {pwdMsg.text}
                </div>
              )}

              <div className="form-group">
                <label>Current Password</label>
                <input type="password" className="glass-input" placeholder="Enter your current password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" className="glass-input" placeholder="Min. 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input type="password" className="glass-input" placeholder="Re-enter new password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary">Update Password</button>
            </form>
          </GlassCard>

          {/* Activity Log Card */}
          <GlassCard>
            <div className="flex-between" style={{ marginBottom: '16px' }}>
              <h4 className="form-section-title" style={{ margin: 0 }}>Recent Activity Log</h4>
              {!logsLoaded && (
                <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={loadActivityLogs}>
                  Load Logs
                </button>
              )}
            </div>
            {logs.length === 0 && logsLoaded && (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No activity recorded yet.</p>
            )}
            {!logsLoaded && (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Click "Load Logs" to view your recent actions.</p>
            )}
            <div className="logs-list">
              {logs.map(log => (
                <div key={log.id} className="log-item">
                  <div className="log-action">{log.action.replace(/_/g, ' ')}</div>
                  <div className="log-details">{log.details}</div>
                  <div className="log-time">{new Date(log.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .profile-settings { display: flex; flex-direction: column; gap: 24px; }
        .section-header h2 { font-size: 24px; font-family: var(--font-display); font-weight: 700; }
        .section-header p { color: var(--text-secondary); font-size: 13.5px; margin-top: 4px; }

        .settings-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 900px) { .settings-grid { grid-template-columns: 1fr; } }

        .settings-col { display: flex; flex-direction: column; gap: 20px; }

        .settings-card-header {
          display: flex;
          align-items: center;
          gap: 20px;
          padding-bottom: 20px;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--border-color);
        }

        .profile-avatar-large {
          width: 64px; height: 64px;
          border-radius: 50%;
          background: var(--gradient-main);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 20px;
          flex-shrink: 0;
          box-shadow: var(--shadow-glow);
        }

        .role-label { color: var(--secondary); font-size: 13px; font-weight: 500; margin-top: 4px; }
        .email-label { color: var(--text-muted); font-size: 12px; margin-top: 2px; }

        .settings-form { display: flex; flex-direction: column; gap: 16px; }
        .form-section-title {
          font-size: 15px;
          font-family: var(--font-display);
          font-weight: 600;
          padding-left: 10px;
          border-left: 3px solid var(--secondary);
          margin-bottom: 4px;
        }

        .theme-toggle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
        }
        .toggle-label { font-size: 14px; font-weight: 500; }
        .toggle-desc { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
        .theme-btn { padding: 8px 16px; font-size: 13px; }

        .logs-list { display: flex; flex-direction: column; gap: 12px; max-height: 300px; overflow-y: auto; }
        .log-item {
          padding: 10px 14px;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-color);
          border-radius: 8px;
        }
        .light-theme .log-item { background: rgba(0,0,0,0.01); }
        .log-action { font-size: 12px; font-weight: 600; color: var(--secondary); }
        .log-details { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
        .log-time { font-size: 10.5px; color: var(--text-muted); margin-top: 4px; }

        .success-alert {
          background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3);
          color: #34d399; border-radius: 8px; padding: 10px; font-size: 13px;
        }
        .error-alert {
          background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171; border-radius: 8px; padding: 10px; font-size: 13px;
        }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label { font-size: 12.5px; font-weight: 500; color: var(--text-secondary); }
      `}} />
    </div>
  );
};

export default ProfileSettings;
