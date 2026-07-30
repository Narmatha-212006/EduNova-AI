import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationsAPI } from '../services/api';

const Navbar = () => {
  const { user, theme, toggleTheme } = useAuth();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return 'Dashboard';
    if (path.includes('/upload')) return 'Upload Assignment';
    if (path.includes('/submissions')) return 'Student Submissions';
    if (path.includes('/evaluation/')) return 'AI Assessment Report';
    if (path.includes('/reports')) return 'Analytics & Reports';
    if (path.includes('/assignments')) return 'Assignments';
    if (path.includes('/profile')) return 'Profile Settings';
    return 'IntelliGrade';
  };

  const fetchNotifications = async () => {
    try {
      const res = await notificationsAPI.getAll();
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 45000);
      return () => clearInterval(interval);
    }
  }, [user, location.pathname]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await notificationsAPI.markAsRead(notif.id);
        setNotifications(prev =>
          prev.map(n => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
      } catch (err) {
        console.error('Failed to mark notification read:', err);
      }
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  return (
    <header className="navbar">
      {/* LEFT: Page Title */}
      <div className="navbar-left">
        <h1 className="navbar-title">{getPageTitle()}</h1>
      </div>

      {/* RIGHT: Actions + Profile */}
      <div className="navbar-right">

        {/* Theme Toggle: Sun (Blue) or Flower (Pink) */}
        <button className="navbar-icon-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to Pink theme' : 'Switch to Blue theme'}>
          {theme === 'dark' ? (
            /* Sun icon — currently in Blue theme */
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          ) : (
            /* Heart icon — currently in Pink theme */
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          )}
        </button>

        {/* Notifications */}
        <div className="notif-container" ref={dropdownRef}>
          <button className="navbar-icon-btn" onClick={() => setShowDropdown(!showDropdown)}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
          </button>

          {showDropdown && (
            <div className="notif-dropdown animate-fade-in">
              <div className="notif-dropdown-header">
                <h3>Notifications</h3>
                <button className="mark-all-btn" onClick={handleMarkAllRead} disabled={unreadCount === 0}>
                  Mark all read
                </button>
              </div>
              <div className="notif-list">
                {notifications.length === 0 ? (
                  <div className="notif-empty">No notifications yet.</div>
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      className={`notif-item ${notif.is_read ? 'read' : 'unread'}`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <div className="notif-title-row">
                        <span className="notif-title">{notif.title}</span>
                        {!notif.is_read && <span className="notif-dot" />}
                      </div>
                      <p className="notif-msg">{notif.message}</p>
                      <span className="notif-time">
                        {new Date(notif.created_at).toLocaleDateString()} ·{' '}
                        {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="navbar-divider" />

        {/* User Profile */}
        <div className="navbar-profile">
          <div className="navbar-avatar">
            {user?.name ? user.name.substring(0, 1).toUpperCase() : 'U'}
          </div>
          <div className="navbar-user-info">
            <span className="navbar-username">{user?.name || 'User'}</span>
            <span className="navbar-role">{user?.role === 'teacher' ? 'Faculty' : 'Student'}</span>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .navbar {
          height: var(--header-height);
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          position: sticky;
          top: 0;
          z-index: 90;
          box-shadow: 0 1px 0 rgba(0,0,0,0.04), 0 2px 8px rgba(79,70,229,0.03);
        }

        .navbar-left {
          display: flex;
          align-items: center;
        }

        .navbar-title {
          font-size: 16px;
          font-weight: 700;
          font-family: var(--font-display);
          color: #1e1b4b;
          letter-spacing: -0.01em;
        }

        .navbar-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .navbar-icon-btn {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          background: #f3f4f6;
          border: 1.5px solid #e5e7eb;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: relative;
          transition: all 0.18s ease;
          outline: none;
          flex-shrink: 0;
        }

        .navbar-icon-btn:hover {
          background: #eef6ff;
          border-color: rgba(79, 70, 229, 0.25);
          color: #4f46e5;
        }

        .notif-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ef4444;
          color: #ffffff;
          font-size: 9px;
          font-weight: 700;
          min-width: 15px;
          height: 15px;
          padding: 0 3px;
          border-radius: 8px;
          border: 2px solid #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .notif-container { position: relative; }

        .notif-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 340px;
          max-height: 440px;
          display: flex;
          flex-direction: column;
          z-index: 200;
          overflow: hidden;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          box-shadow: 0 8px 30px rgba(79,70,229,0.1), 0 2px 8px rgba(0,0,0,0.06);
        }

        .notif-dropdown-header {
          padding: 12px 16px;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .notif-dropdown-header h3 {
          font-size: 13.5px;
          font-family: var(--font-display);
          font-weight: 700;
          color: #1e1b4b;
        }

        .mark-all-btn {
          background: none;
          border: none;
          color: #4f46e5;
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
          outline: none;
          transition: color 0.2s;
          font-family: var(--font-sans);
        }
        .mark-all-btn:hover { color: #ec4899; }
        .mark-all-btn:disabled { color: #9ca3af; cursor: not-allowed; }

        .notif-list {
          flex: 1;
          overflow-y: auto;
          max-height: 360px;
        }

        .notif-empty {
          padding: 40px 20px;
          text-align: center;
          color: #9ca3af;
          font-size: 13px;
        }

        .notif-item {
          padding: 10px 16px;
          border-bottom: 1px solid #f9fafb;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .notif-item:last-child { border-bottom: none; }
        .notif-item:hover { background: #f8f9ff; }
        .notif-item.unread { background: rgba(79, 70, 229, 0.03); }

        .notif-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 3px;
        }

        .notif-title { font-size: 12.5px; font-weight: 600; color: #1e1b4b; }
        .notif-dot { width: 6px; height: 6px; border-radius: 50%; background: #4f46e5; flex-shrink: 0; }
        .notif-msg { font-size: 12px; color: #6b7280; line-height: 1.4; margin-bottom: 3px; }
        .notif-time { font-size: 10.5px; color: #9ca3af; }

        .navbar-divider {
          width: 1px;
          height: 24px;
          background: #e5e7eb;
          flex-shrink: 0;
          margin: 0 4px;
        }

        .navbar-profile {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .navbar-avatar {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          background: linear-gradient(135deg, #4f46e5 0%, #818cf8 100%);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 13px;
          box-shadow: 0 2px 8px rgba(79, 70, 229, 0.2);
          flex-shrink: 0;
        }

        .navbar-user-info {
          display: flex;
          flex-direction: column;
        }

        .navbar-username {
          font-size: 12.5px;
          font-weight: 600;
          color: #1e1b4b;
          line-height: 1.2;
        }

        .navbar-role {
          font-size: 10.5px;
          color: #9ca3af;
        }
      `}} />
    </header>
  );
};

export default Navbar;
