import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginType, setLoginType] = useState('admin'); // 'admin' or 'intern'

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  // Attempt login
  const attemptLogin = async (credentials) => {
    setLoading(true);
    setError('');
    try {
      console.log('🔐 Attempting login with:', credentials.email);
      
      const response = await authAPI.login(credentials);

      if (response.success && response.data) {
        const { user, token } = response.data;

        // Store token and user in localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        console.log('✅ Login successful. User role:', user.role);

        // Redirect based on role
        if (user.role === 'ADMIN') {
          navigate('/admin/dashboard', { replace: true });
        } else if (user.role === 'INTERN') {
          navigate('/intern/dashboard', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        setError(response.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      
      // Extract error message
      const errorMessage = err?.data?.message 
        || err?.message 
        || 'Login failed. Please check your credentials.';
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      return;
    }

    await attemptLogin(formData);
  };

  // Login as admin (demo)
  const loginAsAdmin = async () => {
    const creds = { email: 'ADMIN001', password: 'admin123' };
    setFormData(creds);
    setLoginType('admin');
    await attemptLogin(creds);
  };

  // Login as intern (demo)
  const loginAsIntern = async () => {
    const creds = { email: 'INT2025001', password: 'int2025001' };
    setFormData(creds);
    setLoginType('intern');
    await attemptLogin(creds);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <div className="logo">🎓</div>
          <h1>Student LMS</h1>
          <p>Learning Management System</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-box">
            <span>⚠️</span>
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="login-form">
          {/* Email Input */}
          <div className="form-group">
            <label htmlFor="email">Email or User ID</label>
            <input
              id="email"
              type="text"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="admin@lms.com or INT2025001"
              required
              disabled={loading}
            />
          </div>

          {/* Password Input */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>

          {/* Submit Button */}
          <button type="submit" disabled={loading} className="login-btn">
            {loading ? (
              <>
                <span className="spinner"></span> Logging in...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>

        {/* Demo Credentials */}
        <div className="login-footer">
          <p className="default-creds-title">Demo Credentials:</p>
          <div className="default-creds">
            <button
              type="button"
              className="cred-btn cred-admin"
              onClick={loginAsAdmin}
              disabled={loading}
              title="Quick login as administrator"
            >
              👨‍💼 Admin Login
            </button>
            <button
              type="button"
              className="cred-btn cred-intern"
              onClick={loginAsIntern}
              disabled={loading}
              title="Quick login as intern"
            >
              👨‍🎓 Intern Login
            </button>
          </div>
          <div className="creds-info">
            <p><strong>Admin:</strong> ADMIN001 / admin123</p>
            <p><strong>Intern:</strong> INT2025001 / int2025001</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;