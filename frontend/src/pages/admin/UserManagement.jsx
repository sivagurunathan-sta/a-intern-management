// frontend/src/pages/admin/UserManagement.jsx - FIXED & CLEAN VERSION
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './UserManagement.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalInterns: 0,
    activeInterns: 0,
    totalSubmissions: 0,
    pendingSubmissions: 0
  });

  const [bulkUsers, setBulkUsers] = useState([
    { userId: '', name: '', email: '', password: '', role: 'INTERN', phone: '' }
  ]);

  const getToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('authToken');
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await axios.get(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data && res.data.success) {
        setUsers(res.data.data.users);
        setFilteredUsers(res.data.data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Error fetching users: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const token = getToken();
      const res = await axios.get(`${API_URL}/admin/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data && res.data.success) {
        setStats(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filterUsers = useCallback(() => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.userId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter === 'active') {
      filtered = filtered.filter(user => user.isActive);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(user => !user.isActive);
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, statusFilter]);

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, [fetchUsers, fetchStats]);

  useEffect(() => {
    filterUsers();
  }, [filterUsers]);

  const fetchUserDetails = async (userId) => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await axios.get(`${API_URL}/admin/users/${userId}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data && res.data.success) {
        setUserDetails(res.data.data);
        setShowDetailsModal(true);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      alert('Error fetching user details: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAdd = async () => {
    // Validate all users
    for (const user of bulkUsers) {
      if (!user.userId || !user.name || !user.email || !user.password) {
        alert('Please fill in all required fields for all users');
        return;
      }
    }

    setLoading(true);
    try {
      const token = getToken();
      const res = await axios.post(
        `${API_URL}/admin/users/bulk-add`,
        { users: bulkUsers },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (res.data && res.data.success) {
        const { created, errors } = res.data.data;
        
        let message = `Successfully added ${created.length} user(s)`;
        if (errors.length > 0) {
          message += `\n\nErrors (${errors.length}):\n` + 
            errors.map(e => `${e.userId}: ${e.error}`).join('\n');
        }
        
        alert(message);
        setShowAddModal(false);
        setBulkUsers([{ userId: '', name: '', email: '', password: '', role: 'INTERN', phone: '' }]);
        fetchUsers();
        fetchStats();
      }
    } catch (error) {
      console.error('Error adding users:', error);
      alert('Error adding users: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    const confirmMessage = `Are you sure you want to ${currentStatus ? 'revoke' : 'restore'} access for this user?`;
    
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const token = getToken();
      const endpoint = currentStatus ? 'revoke' : 'restore';
      await axios.post(
        `${API_URL}/admin/users/${userId}/${endpoint}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      fetchUsers();
      fetchStats();
      alert(`Access ${currentStatus ? 'revoked' : 'restored'} successfully!`);
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Error updating user status: ' + (error.response?.data?.message || error.message));
    }
  };

  const toggleChatAccess = async (userId, currentStatus) => {
    const confirmMessage = `Are you sure you want to ${currentStatus ? 'disable' : 'enable'} chat for this user?`;
    
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const token = getToken();
      const endpoint = currentStatus ? 'disable-chat' : 'enable-chat';
      await axios.post(
        `${API_URL}/admin/users/${userId}/${endpoint}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      fetchUsers();
      alert(`Chat access ${currentStatus ? 'disabled' : 'enabled'} successfully!`);
    } catch (error) {
      console.error('Error updating chat access:', error);
      alert('Error updating chat access: ' + (error.response?.data?.message || error.message));
    }
  };

  const addUserRow = () => {
    setBulkUsers([...bulkUsers, { userId: '', name: '', email: '', password: '', role: 'INTERN', phone: '' }]);
  };

  const removeUserRow = (index) => {
    const updated = bulkUsers.filter((_, i) => i !== index);
    setBulkUsers(updated);
  };

  const updateUserRow = (index, field, value) => {
    const updated = [...bulkUsers];
    updated[index][field] = value;
    setBulkUsers(updated);
  };

  if (loading && users.length === 0) {
    return <div className="loading">Loading users...</div>;
  }

  return (
    <div className="user-management-container">
      <div className="page-header">
        <div>
          <h1>👥 User Management</h1>
          <p className="subtitle">Manage all users and their access</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          ➕ Add Users
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👨‍🎓</div>
          <div className="stat-content">
            <h3>{stats.totalInterns}</h3>
            <p>Total Interns</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{stats.activeInterns}</h3>
            <p>Active Interns</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <h3>{stats.totalSubmissions}</h3>
            <p>Total Submissions</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>{stats.pendingSubmissions}</h3>
            <p>Pending Reviews</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <input
          type="text"
          placeholder="🔍 Search by name, email, or user ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Users</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <div className="no-data">
          <p>No users found</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Enrollments</th>
                <th>Chat</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} onClick={() => fetchUserDetails(user.id)} style={{ cursor: 'pointer' }}>
                  <td><strong>{user.userId}</strong></td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge ${user.role.toLowerCase()}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>{user.phone || '-'}</td>
                  <td>{user.enrollments?.length || 0}</td>
                  <td>
                    {user.chatPermission?.isEnabled ? (
                      <span className="badge-success">✓ Enabled</span>
                    ) : (
                      <span className="badge-disabled">✗ Disabled</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                      {user.isActive ? '✓ Active' : '✗ Inactive'}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="action-buttons">
                      <button
                        onClick={() => toggleUserStatus(user.id, user.isActive)}
                        className={user.isActive ? 'btn-revoke' : 'btn-restore'}
                        title={user.isActive ? 'Revoke Access' : 'Restore Access'}
                      >
                        {user.isActive ? '🚫 Revoke' : '✅ Restore'}
                      </button>
                      <button
                        onClick={() => toggleChatAccess(user.id, user.chatPermission?.isEnabled)}
                        className="btn-chat"
                        title={user.chatPermission?.isEnabled ? 'Disable Chat' : 'Enable Chat'}
                      >
                        💬 Chat
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Users Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Multiple Users</h2>
              <button className="btn-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            
            <div className="bulk-users-container">
              {bulkUsers.map((user, index) => (
                <div key={index} className="user-row">
                  <div className="user-row-number">{index + 1}</div>
                  <input
                    type="text"
                    placeholder="User ID (e.g., INT2025012)"
                    value={user.userId}
                    onChange={(e) => updateUserRow(index, 'userId', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Name"
                    value={user.name}
                    onChange={(e) => updateUserRow(index, 'name', e.target.value)}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={user.email}
                    onChange={(e) => updateUserRow(index, 'email', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Password"
                    value={user.password}
                    onChange={(e) => updateUserRow(index, 'password', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Phone (optional)"
                    value={user.phone}
                    onChange={(e) => updateUserRow(index, 'phone', e.target.value)}
                  />
                  <select
                    value={user.role}
                    onChange={(e) => updateUserRow(index, 'role', e.target.value)}
                  >
                    <option value="INTERN">Intern</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  {bulkUsers.length > 1 && (
                    <button
                      className="btn-remove-row"
                      onClick={() => removeUserRow(index)}
                      title="Remove this user"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button className="btn-add-row" onClick={addUserRow}>
              ➕ Add Another User
            </button>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleBulkAdd}
                disabled={loading}
              >
                {loading ? 'Adding...' : `Add ${bulkUsers.length} User(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showDetailsModal && userDetails && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>👤 {userDetails.user.name}</h2>
                <p className="user-id-subtitle">ID: {userDetails.user.userId}</p>
              </div>
              <button className="btn-close" onClick={() => setShowDetailsModal(false)}>✕</button>
            </div>

            {/* User Information */}
            <div className="details-section">
              <h3>📋 Basic Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Email:</label>
                  <span>{userDetails.user.email}</span>
                </div>
                <div className="info-item">
                  <label>Phone:</label>
                  <span>{userDetails.user.phone || 'Not provided'}</span>
                </div>
                <div className="info-item">
                  <label>Role:</label>
                  <span className={`role-badge ${userDetails.user.role.toLowerCase()}`}>
                    {userDetails.user.role}
                  </span>
                </div>
                <div className="info-item">
                  <label>Status:</label>
                  <span className={`status-badge ${userDetails.user.isActive ? 'active' : 'inactive'}`}>
                    {userDetails.user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="info-item">
                  <label>Joined:</label>
                  <span>{new Date(userDetails.user.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="info-item">
                  <label>Chat Access:</label>
                  <span className={userDetails.user.chatPermission?.isEnabled ? 'text-success' : 'text-muted'}>
                    {userDetails.user.chatPermission?.isEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="details-section">
              <h3>📊 Statistics</h3>
              <div className="stats-grid-small">
                <div className="stat-item">
                  <div className="stat-value">{userDetails.stats.totalEnrollments}</div>
                  <div className="stat-label">Total Enrollments</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{userDetails.stats.completedEnrollments}</div>
                  <div className="stat-label">Completed</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{userDetails.stats.totalSubmissions}</div>
                  <div className="stat-label">Submissions</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{userDetails.stats.approvedSubmissions}</div>
                  <div className="stat-label">Approved</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{userDetails.stats.pendingSubmissions}</div>
                  <div className="stat-label">Pending</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{userDetails.stats.totalCertificates}</div>
                  <div className="stat-label">Certificates</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{userDetails.stats.totalScore}</div>
                  <div className="stat-label">Total Score</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{userDetails.stats.verifiedPayments}</div>
                  <div className="stat-label">Payments</div>
                </div>
              </div>
            </div>

            {/* Enrollments */}
            <div className="details-section">
              <h3>📚 Enrollments ({userDetails.user.enrollments.length})</h3>
              {userDetails.user.enrollments.length === 0 ? (
                <p className="no-data-text">No enrollments yet</p>
              ) : (
                <div className="enrollments-list">
                  {userDetails.user.enrollments.map(enrollment => (
                    <div key={enrollment.id} className="enrollment-item">
                      <div className="enrollment-header">
                        <h4>{enrollment.internship.title}</h4>
                        {enrollment.isCompleted && (
                          <span className="badge-success">✓ Completed</span>
                        )}
                      </div>
                      <div className="enrollment-details">
                        <span>📅 Enrolled: {new Date(enrollment.enrollmentDate).toLocaleDateString()}</span>
                        <span>📝 Tasks: {enrollment.submissions.length}</span>
                        <span>⭐ Score: {enrollment.finalScore || 0}</span>
                        {enrollment.certificateIssued && (
                          <span className="text-success">🎓 Certificate Issued</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payments History */}
            <div className="details-section">
              <h3>💰 Payment History ({userDetails.user.payments.length})</h3>
              {userDetails.user.payments.length === 0 ? (
                <p className="no-data-text">No payments yet</p>
              ) : (
                <div className="payments-list">
                  {userDetails.user.payments.map(payment => (
                    <div key={payment.id} className="payment-item">
                      <div className="payment-header">
                        <span className="payment-type">{payment.paymentType}</span>
                        <span className="payment-amount">₹{payment.amount}</span>
                      </div>
                      <div className="payment-details">
                        <span>📅 {new Date(payment.createdAt).toLocaleDateString()}</span>
                        <span className={`payment-status ${payment.paymentStatus.toLowerCase()}`}>
                          {payment.paymentStatus}
                        </span>
                        {payment.transactionId && (
                          <span className="transaction-id">ID: {payment.transactionId}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Submissions */}
            <div className="details-section">
              <h3>📝 Recent Submissions</h3>
              {userDetails.user.submissions.length === 0 ? (
                <p className="no-data-text">No submissions yet</p>
              ) : (
                <div className="submissions-list">
                  {userDetails.user.submissions.slice(0, 10).map(submission => (
                    <div key={submission.id} className="submission-item">
                      <div className="submission-header">
                        <span className="task-title">
                          Task #{submission.task.taskNumber}: {submission.task.title}
                        </span>
                        <span className={`submission-status ${submission.status.toLowerCase()}`}>
                          {submission.status}
                        </span>
                      </div>
                      <div className="submission-details">
                        <span>📅 {new Date(submission.submissionDate).toLocaleDateString()}</span>
                        {submission.score && <span>⭐ Score: {submission.score}</span>}
                        {submission.githubUrl && (
                          <a href={submission.githubUrl} target="_blank" rel="noopener noreferrer" className="github-link">
                            🔗 GitHub
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="modal-actions">
              <button
                onClick={() => toggleUserStatus(userDetails.user.id, userDetails.user.isActive)}
                className={userDetails.user.isActive ? 'btn-revoke' : 'btn-restore'}
              >
                {userDetails.user.isActive ? '🚫 Revoke Access' : '✅ Restore Access'}
              </button>
              <button
                onClick={() => toggleChatAccess(userDetails.user.id, userDetails.user.chatPermission?.isEnabled)}
                className="btn-chat"
              >
                {userDetails.user.chatPermission?.isEnabled ? '💬 Disable Chat' : '💬 Enable Chat'}
              </button>
              <button className="btn-secondary" onClick={() => setShowDetailsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;