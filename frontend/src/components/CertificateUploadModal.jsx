// frontend/src/components/CertificateUploadModal.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CertificateUploadModal.css';

const API_URL = 'http://localhost:5000/api';

const CertificateUploadModal = ({ isOpen, onClose, onSuccess }) => {
  const [certificateStatus, setCertificateStatus] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationMessage, setValidationMessage] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (isOpen) {
      fetchCertificateStatus();
    }
  }, [isOpen]);

  // Fetch certificate status
  const fetchCertificateStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/certificates/intern/my-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCertificateStatus(res.data.data);
    } catch (error) {
      setError('Error fetching status: ' + error.message);
    }
  };

  // Upload certificate for validation
  const handleUploadCertificate = async () => {
    if (!selectedFile) {
      setError('Please select a certificate file');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('certificate', selectedFile);

      const res = await axios.post(
        `${API_URL}/certificates/intern/upload-for-validation`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setValidationMessage('✅ Certificate uploaded successfully! Admin will verify within 24 hours.');
      setSelectedFile(null);
      setTimeout(() => {
        onClose();
        onSuccess();
      }, 2000);
    } catch (error) {
      setError('Error uploading certificate: ' + error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📜 Upload Certificate for Validation</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        {certificateStatus?.session && (
          <div className="status-info">
            <p><strong>Certificate Status:</strong> {certificateStatus.session.status}</p>
            <p><strong>Certificate #:</strong> {certificateStatus.session.certificateNumber}</p>
            <p><strong>Uploaded At:</strong> {new Date(certificateStatus.session.uploadedAt).toLocaleString()}</p>
          </div>
        )}

        {certificateStatus?.validation && (
          <div className={`validation-info ${certificateStatus.validation.status.toLowerCase()}`}>
            <p><strong>Validation Status:</strong> {certificateStatus.validation.status}</p>
            {certificateStatus.validation.reviewMessage && (
              <p><strong>Admin Feedback:</strong> {certificateStatus.validation.reviewMessage}</p>
            )}
          </div>
        )}

        {error && <div className="error-message">❌ {error}</div>}
        {validationMessage && <div className="success-message">✅ {validationMessage}</div>}

        <div className="form-group">
          <label>📄 Certificate PDF File *</label>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setSelectedFile(e.target.files[0])}
            disabled={loading}
          />
          {selectedFile && <p className="file-selected">✓ {selectedFile.name}</p>}
        </div>

        <div className="info-box">
          <h4>📋 Instructions:</h4>
          <ul>
            <li>Upload your certificate in PDF format</li>
            <li>Make sure the certificate is clear and readable</li>
            <li>Admin will verify within 24 hours</li>
            <li>You'll receive notification when verified</li>
          </ul>
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleUploadCertificate} disabled={loading || !selectedFile}>
            {loading ? '⏳ Uploading...' : '📤 Upload Certificate'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CertificateUploadModal;