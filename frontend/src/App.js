// frontend/src/App.js - COMPLETE WITH ALL CERTIFICATES ROUTES

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import UserManagement from './pages/admin/UserManagement';
import Internships from './pages/admin/Internships';
import Submissions from './pages/admin/Submissions';
import Payments from './pages/admin/Payments';
import Certificates from './pages/admin/Certificates';
import Analytics from './pages/admin/Analytics';
import InternDashboard from './pages/intern/Dashboard';
import InternCertificates from './pages/intern/Certificates'; // ✅ NEW IMPORT
import { authAPI } from './services/api';
import './App.css';

// ============================================================================
// LOGIN PAGE
// ============================================================================

const LoginPage = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!credentials.email || !credentials.password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.login(credentials.email, credentials.password);
      
      if (response?.data?.success) {
        const { user, token } = response.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(user));
        onLogin(user);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">🎓 Student LMS</h1>
          <p className="login-subtitle">Sign in to your account</p>
        </div>

        {error && <div className="login-error">❌ {error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-input-group">
            <label className="login-label">Email</label>
            <input
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
              placeholder="admin@lms.com"
              className="login-input"
              required
              disabled={loading}
            />
          </div>

          <div className="login-input-group">
            <label className="login-label">Password</label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              placeholder="Enter your password"
              className="login-input"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="login-button"
            style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? '🔄 Signing in...' : '🔐 Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <p className="login-help-text">💡 <strong>Default Credentials:</strong></p>
          <div className="login-credential-box">
            <p className="login-credential"><strong>👨‍💼 Admin:</strong> admin@lms.com / admin123</p>
            <p className="login-credential"><strong>👨‍🎓 Intern:</strong> intern@lms.com / int2025001</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// ADMIN LAYOUT
// ============================================================================

const AdminLayout = ({ user, onLogout, children }) => {
  const location = useLocation();

  const menuItems = [
    { path: '/admin/users', icon: '👥', label: 'User Management' },
    { path: '/admin/internships', icon: '📚', label: 'Internships' },
    { path: '/admin/submissions', icon: '📝', label: 'Submissions' },
    { path: '/admin/payments', icon: '💰', label: 'Payments' },
    { path: '/admin/certificates', icon: '🎓', label: 'Certificates' },
    { path: '/admin/analytics', icon: '📊', label: 'Analytics' }
  ];

  return (
    <div className="layout-container">
      <aside className="layout-sidebar">
        <div className="layout-sidebar-header">
          <h2 className="layout-logo">🎓 Student LMS</h2>
          <p className="layout-logo-subtitle">Admin Portal</p>
        </div>

        <nav className="layout-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="layout-nav-item"
              style={{
                backgroundColor: location.pathname === item.path ? '#3b82f6' : 'transparent',
                color: location.pathname === item.path ? 'white' : '#6b7280'
              }}
            >
              <span className="layout-nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="layout-sidebar-footer">
          <div className="layout-user-info">
            <div className="layout-user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="layout-user-name">{user.name}</div>
              <div className="layout-user-role">{user.role}</div>
            </div>
          </div>
          <button onClick={onLogout} className="layout-logout-button">
            🚪 Logout
          </button>
        </div>
      </aside>

      <main className="layout-main">{children}</main>
    </div>
  );
};

// ============================================================================
// PROTECTED ROUTE
// ============================================================================

const ProtectedRoute = ({ children, user, requiredRole }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    const userRole = (user.role || '').toString().toUpperCase();
    const reqRole = (requiredRole || '').toString().toUpperCase();
    if (userRole !== reqRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
};

// ============================================================================
// PLACEHOLDER PAGES
// ============================================================================

const UnauthorizedPage = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const checkAndRedirect = async () => {
      try {
        const stored = localStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          const role = (parsed?.role || '').toString().toUpperCase();
          if (role === 'INTERN') return navigate('/intern/dashboard');
          if (role === 'ADMIN') return navigate('/admin/users');
        }
      } catch (e) {
        console.log('Redirect check error:', e);
      }
    };

    checkAndRedirect();
  }, [navigate]);

  return (
    <div className="placeholder-container">
      <h1 className="placeholder-title">🚫 Unauthorized</h1>
      <p className="placeholder-subtitle">You don't have permission to access this page.</p>
    </div>
  );
};

const NotFoundPage = () => (
  <div className="placeholder-container">
    <h1 className="placeholder-title">404</h1>
    <p className="placeholder-subtitle">Page not found</p>
    <Link to="/" className="placeholder-link">
      ← Go back home
    </Link>
  </div>
);

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.role) {
          parsedUser.role = parsedUser.role.toString().toUpperCase();
        }
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      }
    }

    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading...</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* ✅ LOGIN ROUTE */}
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to={user.role === 'ADMIN' ? '/admin/users' : '/intern/dashboard'} replace />
            ) : (
              <LoginPage onLogin={handleLogin} />
            )
          }
        />

        {/* ✅ ADMIN ROUTES */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute user={user} requiredRole="ADMIN">
              <AdminLayout user={user} onLogout={handleLogout}>
                <Routes>
                  <Route path="users" element={<UserManagement />} />
                  <Route path="internships" element={<Internships />} />
                  <Route path="submissions" element={<Submissions />} />
                  <Route path="payments" element={<Payments />} />
                  <Route path="certificates" element={<Certificates />} />
                  <Route path="analytics" element={<Analytics />} />
                </Routes>
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* ✅ UNAUTHORIZED ROUTE */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* ✅ INTERN DASHBOARD ROUTE */}
        <Route
          path="/intern/dashboard"
          element={
            <ProtectedRoute user={user} requiredRole="INTERN">
              <InternDashboard />
            </ProtectedRoute>
          }
        />

        {/* ✅ INTERN CERTIFICATES ROUTE - NEW */}
        <Route
          path="/intern/certificates"
          element={
            <ProtectedRoute user={user} requiredRole="INTERN">
              <InternCertificates />
            </ProtectedRoute>
          }
        />

        {/* ✅ DEFAULT REDIRECT */}
        <Route
          path="/"
          element={<Navigate to={user ? (user.role === 'ADMIN' ? '/admin/users' : '/intern/dashboard') : '/login'} replace />}
        />

        {/* ✅ 404 CATCH ALL */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
};

export default App;

/*
  NOTE: All styles have been moved to App.css
  Import statement: import './App.css';
*/