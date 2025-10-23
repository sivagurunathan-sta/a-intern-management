// frontend/src/pages/admin/CertificateSession.jsx - COMPLETE WORKING VERSION
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Certificates.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const CertificateSession = () => {
  const [sessions, setSessions] = useState([]);
  const [issuedCerts, setIssuedCerts] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedSession, setSelectedSession] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [certificateFile, setCertificateFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [uploadProgress, setUploadProgress] = useState(0);

  const getToken = () => localStorage.getItem('token') || localStorage.getItem('authToken');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Auto-refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const token = getToken();
      
      // Fetch pending certificate sessions
      const pendingRes = await axios.get(`${API_URL}/certificates/admin/pending-sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (pendingRes.data.success && Array.isArray(pendingRes.data.data.sessions)) {
        setSessions(pendingRes.data.data.sessions);
      }

      // Fetch issued certificates
      const issuedRes = await axios.get(`${API_URL}/certificates/admin/issued`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (issuedRes.data.success && Array.isArray(issuedRes.data.data.sessions)) {
        setIssuedCerts(issuedRes.data.data.sessions);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showMessage('error', 'Failed to load certificate sessions');
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const openUploadModal = (session) => {
    setSelectedSession(session);
    setCertificateFile(null);
    setUploadProgress(0);
    setShowUploadModal(true);
  };

  const openDetailsModal = (session) => {
    setSelectedSession(session);
    setShowDetailsModal(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        showMessage('error', '❌ Only PDF files are allowed');
        setCertificateFile(null);
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showMessage('error', '❌ File size must be less than 10MB');
        setCertificateFile(null);
        return;
      }
      setCertificateFile(file);
    }
  };

  const handleUploadCertificate = async () => {
    if (!certificateFile) {
      showMessage('error', '❌ Please select a certificate PDF file');
      return;
    }

    if (!selectedSession || !selectedSession.id) {
      showMessage('error', '❌ Invalid session selected');
      return;
    }

    setLoading(true);
    try {
      const token = getToken();
      const formData = new FormData();
      formData.append('certificate', certificateFile);

      const res = await axios.post(
        `${API_URL}/certificates/admin/upload/${selectedSession.id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        }
      );

      if (res.data.success) {
        showMessage('success', '✅ Certificate uploaded and issued successfully!');
        setShowUploadModal(false);
        setCertificateFile(null);
        setUploadProgress(0);
        setSelectedSession(null);
        
        // Refresh data after upload
        await fetchData();
      }
    } catch (error) {
      console.error('Upload error:', error);
      showMessage('error', error.response?.data?.message || 'Failed to upload certificate');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="cert-session-container">
      <div className="page-header">
        <h1>🎓 Certificate Management</h1>
        <p>Manage certificate uploads and issuance</p>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          ⏳ Pending Upload
          <span className="badge">{sessions.length}</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'issued' ? 'active' : ''}`}
          onClick={() => setActiveTab('issued')}
        >
          ✅ Issued Certificates
          <span className="badge">{issuedCerts.length}</span>
        </button>
      </div>

      {/* Pending Sessions Tab */}
      {activeTab === 'pending' && (
        <div className="tab-content">
          {sessions.length === 0 ? (
            <div className="empty-state">
              <p>📭 No pending certificate uploads</p>
            </div>
          ) : (
            <div className="sessions-table-wrapper">
              <table className="sessions-table">
                <thead>
                  <tr>
                    <th>Intern Name</th>
                    <th>Email</th>
                    <th>Internship</th>
                    <th>Cert Number</th>
                    <th>Payment Status</th>
                    <th>Session Started</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(session => (
                    <tr key={session.id}>
                      <td>
                        <strong>{session.user?.name || 'N/A'}</strong>
                      </td>
                      <td>
                        <small>{session.user?.email || 'N/A'}</small>
                      </td>
                      <td>
                        {session.enrollment?.internship?.title || 'N/A'}
                      </td>
                      <td>
                        <code>{session.certificateNumber || 'N/A'}</code>
                      </td>
                      <td>
                        <span className="badge-verified">
                          ✅ {session.payment?.verifiedAt ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td>
                        {formatDate(session.sessionStartedAt)}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-details"
                            onClick={() => openDetailsModal(session)}
                            title="View Details"
                          >
                            👁️ Details
                          </button>
                          <button
                            className="btn-upload"
                            onClick={() => openUploadModal(session)}
                            title="Upload Certificate"
                          >
                            📤 Upload
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Issued Certificates Tab */}
      {activeTab === 'issued' && (
        <div className="tab-content">
          {issuedCerts.length === 0 ? (
            <div className="empty-state">
              <p>📭 No issued certificates yet</p>
            </div>
          ) : (
            <div className="sessions-table-wrapper">
              <table className="sessions-table">
                <thead>
                  <tr>
                    <th>Intern Name</th>
                    <th>Email</th>
                    <th>Internship</th>
                    <th>Cert Number</th>
                    <th>Issued Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {issuedCerts.map(cert => (
                    <tr key={cert.id}>
                      <td>
                        <strong>{cert.user?.name || 'N/A'}</strong>
                      </td>
                      <td>
                        <small>{cert.user?.email || 'N/A'}</small>
                      </td>
                      <td>
                        {cert.enrollment?.internship?.title || 'N/A'}
                      </td>
                      <td>
                        <code>{cert.certificateNumber || 'N/A'}</code>
                      </td>
                      <td>
                        {formatDate(cert.issuedAt)}
                      </td>
                      <td>
                        <span className="badge-issued">
                          ✅ Issued
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && selectedSession && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📤 Upload Certificate</h2>
              <button
                className="close-btn"
                onClick={() => setShowUploadModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="section">
                <h3>📋 Session Details</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Intern:</label>
                    <span>{selectedSession.user?.name}</span>
                  </div>
                  <div className="info-item">
                    <label>Email:</label>
                    <span>{selectedSession.user?.email}</span>
                  </div>
                  <div className="info-item">
                    <label>Internship:</label>
                    <span>{selectedSession.enrollment?.internship?.title}</span>
                  </div>
                  <div className="info-item">
                    <label>Certificate Number:</label>
                    <code>{selectedSession.certificateNumber}</code>
                  </div>
                </div>
              </div>

              <div className="section">
                <h3>📄 Upload Certificate PDF</h3>
                <div className="form-group">
                  <label>Certificate PDF File *</label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    disabled={loading}
                    style={{
                      borderColor: certificateFile ? '#4CAF50' : '#ddd'
                    }}
                  />
                  <small>
                    • Only PDF files allowed
                    <br />
                    • Maximum file size: 10MB
                    <br />
                    • File name format: CERT-{selectedSession.certificateNumber}.pdf
                  </small>
                  {certificateFile && (
                    <p className="file-selected">
                      ✅ Selected: {certificateFile.name}
                    </p>
                  )}
                </div>

                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="progress-container">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="progress-text">{uploadProgress}% Uploading...</p>
                  </div>
                )}
              </div>

              <div className="checklist">
                <h4>✅ Verification Checklist:</h4>
                <ul>
                  <li>✓ PDF file is valid and readable</li>
                  <li>✓ Certificate contains correct intern name</li>
                  <li>✓ Certificate number matches: {selectedSession.certificateNumber}</li>
                  <li>✓ File size is under 10MB</li>
                </ul>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowUploadModal(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="btn-upload-submit"
                onClick={handleUploadCertificate}
                disabled={!certificateFile || loading}
              >
                {loading ? (
                  <>⏳ Uploading ({uploadProgress}%)...</>
                ) : (
                  <>📤 Upload & Issue Certificate</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedSession && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 Session Details</h2>
              <button
                className="close-btn"
                onClick={() => setShowDetailsModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="section">
                <h3>👤 Intern Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Name:</label>
                    <span>{selectedSession.user?.name}</span>
                  </div>
                  <div className="info-item">
                    <label>Email:</label>
                    <span>{selectedSession.user?.email}</span>
                  </div>
                  <div className="info-item">
                    <label>User ID:</label>
                    <span>{selectedSession.user?.userId}</span>
                  </div>
                  <div className="info-item">
                    <label>Phone:</label>
                    <span>{selectedSession.user?.phone || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="section">
                <h3>📚 Internship Details</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Title:</label>
                    <span>{selectedSession.enrollment?.internship?.title}</span>
                  </div>
                  <div className="info-item">
                    <label>Enrollment Date:</label>
                    <span>{formatDate(selectedSession.enrollment?.enrollmentDate)}</span>
                  </div>
                </div>
              </div>

              <div className="section">
                <h3>🎓 Certificate Details</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Certificate Number:</label>
                    <code>{selectedSession.certificateNumber}</code>
                  </div>
                  <div className="info-item">
                    <label>Session Status:</label>
                    <span className="badge-pending">⏳ {selectedSession.status}</span>
                  </div>
                  <div className="info-item">
                    <label>Session Started:</label>
                    <span>{formatDate(selectedSession.sessionStartedAt)}</span>
                  </div>
                  <div className="info-item">
                    <label>Expected Delivery:</label>
                    <span>{formatDate(selectedSession.expectedDeliveryAt)}</span>
                  </div>
                </div>
              </div>

              <div className="section">
                <h3>💰 Payment Status</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Payment Status:</label>
                    <span className="badge-verified">
                      ✅ {selectedSession.payment?.paymentStatus || 'Pending'}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>Amount:</label>
                    <span>₹{selectedSession.payment?.amount || 0}</span>
                  </div>
                  <div className="info-item">
                    <label>Verified At:</label>
                    <span>
                      {selectedSession.payment?.verifiedAt
                        ? formatDate(selectedSession.payment.verifiedAt)
                        : 'Not verified'}
                    </span>
                  </div>
                </div>
              </div>

              {selectedSession.enrollment?.submissions && (
                <div className="section">
                  <h3>📊 Performance</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>Approved Submissions:</label>
                      <span>
                        {selectedSession.enrollment.submissions.filter(s => s.status === 'APPROVED').length}
                      </span>
                    </div>
                    <div className="info-item">
                      <label>Average Score:</label>
                      <span>
                        {selectedSession.enrollment.submissions.length > 0
                          ? Math.round(
                              selectedSession.enrollment.submissions.reduce((acc, s) => acc + (s.score || 0), 0) /
                              selectedSession.enrollment.submissions.length
                            )
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </button>
              <button
                className="btn-upload"
                onClick={() => {
                  setShowDetailsModal(false);
                  openUploadModal(selectedSession);
                }}
              >
                📤 Upload Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificateSession;