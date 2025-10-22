// frontend/src/pages/admin/Certificates.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Certificates.css';

const API_URL = 'http://localhost:5000/api';

const Certificates = () => {
  const [tab, setTab] = useState('upload'); // upload, pending, validations
  const [certificates, setCertificates] = useState([]);
  const [validations, setValidations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCert, setSelectedCert] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    paymentId: '',
    certificate: null
  });
  const [reviewData, setReviewData] = useState({
    message: '',
    action: 'approve'
  });

  const token = localStorage.getItem('token');

  // Fetch pending certificates
  const fetchPendingCertificates = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/certificates/admin/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCertificates(res.data.data.certificates);
    } catch (error) {
      alert('Error fetching certificates: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch pending validations
  const fetchPendingValidations = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/certificates/admin/validations/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setValidations(res.data.data.validations);
    } catch (error) {
      alert('Error fetching validations: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'pending') {
      fetchPendingCertificates();
    } else if (tab === 'validations') {
      fetchPendingValidations();
    }
  }, [tab]);

  // Upload certificate
  const handleUploadCertificate = async () => {
    if (!uploadData.paymentId || !uploadData.certificate) {
      alert('Please select payment and certificate file');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('certificate', uploadData.certificate);

      const res = await axios.post(
        `${API_URL}/certificates/admin/upload/${uploadData.paymentId}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      alert('Certificate uploaded successfully!');
      setShowUploadModal(false);
      setUploadData({ paymentId: '', certificate: null });
      fetchPendingCertificates();
    } catch (error) {
      alert('Error uploading certificate: ' + error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  // Approve/Reject certificate
  const handleReviewCertificate = async () => {
    setLoading(true);
    try {
      if (reviewData.action === 'approve') {
        await axios.post(
          `${API_URL}/certificates/admin/${selectedCert.id}/approve`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Certificate approved!');
      } else {
        if (!reviewData.message) {
          alert('Please provide rejection reason');
          setLoading(false);
          return;
        }
        await axios.post(
          `${API_URL}/certificates/admin/${selectedCert.id}/reject`,
          { rejectionMessage: reviewData.message },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Certificate rejected!');
      }
      setShowReviewModal(false);
      setReviewData({ message: '', action: 'approve' });
      setSelectedCert(null);
      fetchPendingCertificates();
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Approve/Reject validation
  const handleReviewValidation = async (validationId, isApprove) => {
    setLoading(true);
    try {
      if (isApprove) {
        await axios.post(
          `${API_URL}/certificates/admin/validations/${validationId}/approve`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Certificate verified!');
      } else {
        const message = prompt('Enter reason for rejection:');
        if (!message) {
          setLoading(false);
          return;
        }
        await axios.post(
          `${API_URL}/certificates/admin/validations/${validationId}/reject`,
          { reviewMessage: message },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Certificate rejected!');
      }
      fetchPendingValidations();
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="certificates-container">
      <div className="page-header">
        <h1>🎓 Certificate Management</h1>
        <p>Manage intern certificates and validations</p>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'upload' ? 'active' : ''}`} onClick={() => setTab('upload')}>
          📤 Upload Certificates
        </button>
        <button className={`tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
          ⏳ Pending ({certificates.length})
        </button>
        <button className={`tab ${tab === 'validations' ? 'active' : ''}`} onClick={() => setTab('validations')}>
          ✅ Validations ({validations.length})
        </button>
      </div>

      {tab === 'upload' && (
        <div className="section">
          <button className="btn-primary" onClick={() => setShowUploadModal(true)}>
            📤 Upload Certificate
          </button>
          <p style={{marginTop: '20px', color: '#666'}}>
            1. Get Payment ID from verified payments<br/>
            2. Upload the certificate PDF for that payment<br/>
            3. Intern will receive notification
          </p>
        </div>
      )}

      {tab === 'pending' && (
        <div className="section">
          {loading ? (
            <p>Loading...</p>
          ) : certificates.length === 0 ? (
            <p className="no-data">No pending certificates</p>
          ) : (
            <div className="certificates-grid">
              {certificates.map(cert => (
                <div key={cert.id} className="certificate-card">
                  <div className="card-header">
                    <h3>{cert.user.name}</h3>
                    <span className="badge">{cert.status}</span>
                  </div>
                  <p><strong>Internship:</strong> {cert.enrollment.internship.title}</p>
                  <p><strong>Certificate #:</strong> {cert.certificateNumber}</p>
                  <p><strong>Uploaded:</strong> {new Date(cert.uploadedAt).toLocaleDateString()}</p>
                  <div className="card-actions">
                    <a href={`http://localhost:5000${cert.certificateUrl}`} target="_blank" rel="noopener noreferrer" className="btn-view">
                      📄 View
                    </a>
                    <button
                      className="btn-approve"
                      onClick={() => {
                        setSelectedCert(cert);
                        setReviewData({ message: '', action: 'approve' });
                        setShowReviewModal(true);
                      }}
                    >
                      ✅ Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'validations' && (
        <div className="section">
          {loading ? (
            <p>Loading...</p>
          ) : validations.length === 0 ? (
            <p className="no-data">No pending validations</p>
          ) : (
            <div className="certificates-grid">
              {validations.map(val => (
                <div key={val.id} className="certificate-card">
                  <div className="card-header">
                    <h3>{val.user.name}</h3>
                    <span className="badge pending">{val.status}</span>
                  </div>
                  <p><strong>Certificate #:</strong> {val.certificateNumber}</p>
                  <p><strong>Submitted:</strong> {new Date(val.submittedAt).toLocaleDateString()}</p>
                  <p><strong>User Email:</strong> {val.user.email}</p>
                  <div className="card-actions">
                    <a href={`http://localhost:5000${val.certificateUrl}`} target="_blank" rel="noopener noreferrer" className="btn-view">
                      📄 View
                    </a>
                    <button
                      className="btn-approve"
                      onClick={() => handleReviewValidation(val.id, true)}
                      disabled={loading}
                    >
                      ✅ Approve
                    </button>
                    <button
                      className="btn-reject"
                      onClick={() => handleReviewValidation(val.id, false)}
                      disabled={loading}
                    >
                      ❌ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>📤 Upload Certificate</h2>
            <div className="form-group">
              <label>Payment ID *</label>
              <input
                type="text"
                value={uploadData.paymentId}
                onChange={(e) => setUploadData({...uploadData, paymentId: e.target.value})}
                placeholder="Enter payment ID"
              />
            </div>
            <div className="form-group">
              <label>Certificate File (PDF) *</label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setUploadData({...uploadData, certificate: e.target.files[0]})}
              />
              {uploadData.certificate && <p className="file-selected">✓ {uploadData.certificate.name}</p>}
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowUploadModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleUploadCertificate} disabled={loading}>
                {loading ? '⏳ Uploading...' : '✓ Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReviewModal && selectedCert && (
        <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>📋 Review Certificate</h2>
            <div className="review-info">
              <p><strong>Intern:</strong> {selectedCert.user.name}</p>
              <p><strong>Email:</strong> {selectedCert.user.email}</p>
              <p><strong>Certificate #:</strong> {selectedCert.certificateNumber}</p>
              <p><strong>Internship:</strong> {selectedCert.enrollment.internship.title}</p>
            </div>
            <div className="form-group">
              <label>Action *</label>
              <select
                value={reviewData.action}
                onChange={(e) => setReviewData({...reviewData, action: e.target.value})}
              >
                <option value="approve">✅ Approve Certificate</option>
                <option value="reject">❌ Reject & Request Correction</option>
              </select>
            </div>
            {reviewData.action === 'reject' && (
              <div className="form-group">
                <label>Reason for Rejection *</label>
                <textarea
                  rows={4}
                  value={reviewData.message}
                  onChange={(e) => setReviewData({...reviewData, message: e.target.value})}
                  placeholder="Explain what needs to be corrected..."
                />
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowReviewModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleReviewCertificate} disabled={loading}>
                {loading ? '⏳ Processing...' : reviewData.action === 'approve' ? '✅ Approve' : '❌ Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Certificates;