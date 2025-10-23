// frontend/src/pages/intern/Certificates.jsx - COMPLETE WORKING STANDALONE PAGE
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Certificates.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Certificates = () => {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCert, setSelectedCert] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const getToken = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    console.log('Token found:', !!token);
    return token;
  };

  // ✅ MAIN FETCH - Called on mount
  useEffect(() => {
    console.log('🔄 Certificates component mounted, fetching data...');
    fetchCertificates();
  }, []);

  // ✅ AUTO-REFRESH every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing certificates...');
      fetchCertificates(true);
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchCertificates = async (isAutoRefresh = false) => {
    try {
      if (isAutoRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const token = getToken();
      
      if (!token) {
        console.error('❌ No token found');
        setError('Authentication required. Please login again.');
        setCertificates([]);
        setLoading(false);
        return;
      }

      console.log('📡 Fetching from:', `${API_URL}/certificates/my-certificates`);
      
      const res = await axios.get(
        `${API_URL}/certificates/my-certificates`,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Response received:', res.data);

      // ✅ IMPORTANT: Handle all response formats
      let certs = [];
      
      if (res.data.success) {
        if (Array.isArray(res.data.data)) {
          certs = res.data.data;
          console.log(`✅ Found ${certs.length} certificates`);
        } else if (res.data.data && typeof res.data.data === 'object') {
          console.warn('⚠️ Data is object, not array:', res.data.data);
          certs = [];
        }
      }

      // ✅ Validate certificate data
      const validCerts = certs.filter(cert => {
        const isValid = cert && 
                       cert.id && 
                       cert.certificateNumber && 
                       cert.enrollment && 
                       cert.enrollment.internship;
        if (!isValid) {
          console.warn('⚠️ Invalid certificate:', cert);
        }
        return isValid;
      });

      console.log(`✅ Valid certificates: ${validCerts.length}`);
      setCertificates(validCerts);

      if (validCerts.length === 0) {
        console.log('ℹ️ No certificates found');
      }
    } catch (error) {
      console.error('❌ Error fetching certificates:', error);
      
      let errorMsg = 'Failed to load certificates';
      if (error.response?.status === 401) {
        errorMsg = 'Session expired. Please login again.';
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setError(errorMsg);
      setCertificates([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const downloadCertificate = async (sessionId, certificateNumber) => {
    if (!sessionId) {
      alert('❌ Invalid session ID');
      return;
    }

    setDownloadingId(sessionId);
    try {
      const token = getToken();
      
      console.log(`📥 Downloading certificate: ${sessionId}`);
      
      const res = await axios.get(
        `${API_URL}/certificates/download/${sessionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      if (res.data.size === 0) {
        alert('❌ Certificate file is empty');
        return;
      }

      // ✅ Create blob and download
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Certificate-${certificateNumber || 'document'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('✅ Download successful');
    } catch (error) {
      console.error('❌ Download error:', error);
      const msg = error.response?.data?.message || error.message || 'Failed to download';
      alert('❌ Error downloading certificate:\n' + msg);
    } finally {
      setDownloadingId(null);
    }
  };

  // ============================================================================
  // RENDER: LOADING STATE
  // ============================================================================
  if (loading) {
    return (
      <div className="certificates-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>📚 Loading your certificates...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: ERROR STATE
  // ============================================================================
  if (error) {
    return (
      <div className="certificates-container">
        <div className="page-header">
          <h1>🎓 My Certificates</h1>
          <p>View and download your earned certificates</p>
        </div>

        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h2>Error Loading Certificates</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={() => fetchCertificates()} className="btn-retry">
              🔄 Try Again
            </button>
            <button onClick={() => navigate('/dashboard')} className="btn-back">
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: EMPTY STATE
  // ============================================================================
  if (!certificates || certificates.length === 0) {
    return (
      <div className="certificates-container">
        <div className="page-header">
          <div>
            <h1>🎓 My Certificates</h1>
            <p>View and download your earned certificates</p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="btn-back-header">
            ← Dashboard
          </button>
        </div>

        <div className="empty-state">
          <div className="empty-icon">📜</div>
          <h2>No Certificates Yet</h2>
          <p>Complete internships and purchase certificates to see them here</p>
          
          <div className="empty-steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>✅ Complete an Internship</h3>
              <p>Finish all required tasks and achieve the passing score (75%+)</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>💳 Purchase Certificate</h3>
              <p>Pay the certificate fee (₹499) after completion</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>⏳ Wait for Verification</h3>
              <p>Admin will verify your payment and upload the certificate</p>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <h3>📥 Download Certificate</h3>
              <p>Once issued, download your certificate PDF here</p>
            </div>
          </div>

          <button onClick={() => navigate('/dashboard')} className="btn-go-dashboard">
            📚 Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: CERTIFICATES LIST
  // ============================================================================
  return (
    <div className="certificates-container">
      <div className="page-header">
        <div>
          <h1>🎓 My Certificates</h1>
          <p>{certificates.length} certificate(s) earned</p>
        </div>
        <div className="header-actions">
          <button 
            onClick={() => fetchCertificates()} 
            className="btn-refresh-header"
            disabled={refreshing}
          >
            {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn-back-header">
            ← Dashboard
          </button>
        </div>
      </div>

      <div className="certificates-grid">
        {certificates.map(cert => (
          <div key={cert.id} className="certificate-card">
            <div className="cert-header">
              <div className="cert-icon">🎓</div>
              <div className="cert-title">
                <h2>{cert.enrollment?.internship?.title || 'Certificate'}</h2>
                <p className="cert-status">✅ Issued</p>
              </div>
            </div>

            <div className="cert-details">
              <div className="detail-item">
                <span className="detail-label">Certificate Number</span>
                <code className="detail-value">{cert.certificateNumber}</code>
              </div>

              <div className="detail-item">
                <span className="detail-label">Status</span>
                <span className="status-badge issued">✅ Issued</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Issued Date</span>
                <span className="detail-value">
                  {cert.issuedAt 
                    ? new Date(cert.issuedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'Processing...'}
                </span>
              </div>

              {cert.uploadedAt && (
                <div className="detail-item">
                  <span className="detail-label">Uploaded</span>
                  <span className="detail-value">
                    {new Date(cert.uploadedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            <div className="cert-actions">
              <button
                className="btn-view"
                onClick={() => {
                  setSelectedCert(cert);
                  setShowModal(true);
                }}
              >
                👁️ View Details
              </button>
              <button
                className="btn-download"
                onClick={() => downloadCertificate(cert.id, cert.certificateNumber)}
                disabled={downloadingId === cert.id}
              >
                {downloadingId === cert.id ? '⏳ Downloading...' : '📥 Download PDF'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Certificate Details Modal */}
      {showModal && selectedCert && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🎓 Certificate Details</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="cert-section">
                <h3>📋 Internship Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Title:</label>
                    <span>{selectedCert.enrollment?.internship?.title || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <label>Certificate Number:</label>
                    <code>{selectedCert.certificateNumber || 'N/A'}</code>
                  </div>
                  <div className="info-item">
                    <label>Status:</label>
                    <span className="status-badge issued">✅ Issued</span>
                  </div>
                </div>
              </div>

              <div className="cert-section">
                <h3>📅 Timeline</h3>
                <div className="timeline">
                  <div className="timeline-item">
                    <div className="timeline-marker">✅</div>
                    <div className="timeline-content">
                      <strong>Certificate Issued</strong>
                      <p>
                        {selectedCert.issuedAt 
                          ? new Date(selectedCert.issuedAt).toLocaleString()
                          : 'Processing...'}
                      </p>
                    </div>
                  </div>
                  {selectedCert.uploadedAt && (
                    <div className="timeline-item">
                      <div className="timeline-marker">📤</div>
                      <div className="timeline-content">
                        <strong>Certificate Uploaded</strong>
                        <p>{new Date(selectedCert.uploadedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {selectedCert.enrollment && (
                <div className="cert-section">
                  <h3>⭐ Performance</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>Final Score:</label>
                      <span className="highlight">
                        {selectedCert.enrollment.finalScore || 0}%
                      </span>
                    </div>
                    <div className="info-item">
                      <label>Completed Tasks:</label>
                      <span>
                        {selectedCert.enrollment.completedTasks || 0} / {selectedCert.enrollment.totalTasks || 0}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Close
              </button>
              <button
                className="btn-download-modal"
                onClick={() => {
                  downloadCertificate(selectedCert.id, selectedCert.certificateNumber);
                  setShowModal(false);
                }}
              >
                📥 Download Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Certificates;