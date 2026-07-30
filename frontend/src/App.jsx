import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Components
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import UploadAssignment from './pages/teacher/UploadAssignment';
import StudentSubmissions from './pages/teacher/StudentSubmissions';
import EvaluationDetail from './pages/teacher/EvaluationDetail';
import Reports from './pages/teacher/Reports';
import ProfileSettings from './pages/teacher/ProfileSettings';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import AvailableAssignments from './pages/student/AvailableAssignments';
import MySubmissions from './pages/student/MySubmissions';
import StudentReports from './pages/student/StudentReports';

// Protect Route Component
const PrivateRoute = ({ allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '100vh', flexDirection: 'column', gap: '15px' }}>
        <div className="spinner"></div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500 }}>Initializing IntelliGrade...</h2>
        <style dangerouslySetInnerHTML={{__html: `
          .flex-center { display: flex; justify-content: center; align-items: center; }
          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid var(--border-color);
            border-top: 4px solid var(--secondary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

// Main Layout Wrapper
const DashboardLayout = () => {
  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="dashboard-main">
        <Navbar />
        <div className="dashboard-content animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

// Root Redirect Handler
const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  
  if (user.role === 'teacher') {
    return <Navigate to="/teacher/dashboard" replace />;
  } else {
    return <Navigate to="/student/dashboard" replace />;
  }
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Root Redirect Path */}
          <Route path="/" element={<RootRedirect />} />

          {/* Protected Teacher Routes */}
          <Route element={<PrivateRoute allowedRoles={['teacher']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
              <Route path="/teacher/upload" element={<UploadAssignment />} />
              <Route path="/teacher/submissions" element={<StudentSubmissions />} />
              <Route path="/teacher/evaluation/:submissionId" element={<EvaluationDetail />} />
              <Route path="/teacher/reports" element={<Reports />} />
              <Route path="/teacher/profile" element={<ProfileSettings />} />
            </Route>
          </Route>

          {/* Protected Student Routes */}
          <Route element={<PrivateRoute allowedRoles={['student']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/assignments" element={<AvailableAssignments />} />
              <Route path="/student/submissions" element={<MySubmissions />} />
              <Route path="/student/reports" element={<StudentReports />} />
              <Route path="/student/profile" element={<ProfileSettings />} /> {/* Share settings page */}
            </Route>
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
