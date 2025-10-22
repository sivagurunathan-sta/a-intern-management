// frontend/src/pages/intern/PaymentPage.jsx - COMPLETE & WORKING
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PaymentPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const PaymentPage = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [payments, setPayments] = useState([]);
  const [showInitiateModal, setShowInitiateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [uploadData, setUploadData] = useState({
    transactionId: '',
    paymentProof: null
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const getToken = () => localStorage.getItem('token') || localStorage.getItem('authToken');

  useEffect(() => {
    fetchEnrollments();
    fetchPayments();
  }, []);

  const fetchEnrollments = async () => {
    try {
      const token = getToken();
      const res = await axios.get(`${API_URL}/intern/enrollments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEnrollments(res.data.data);
      if (res.data.data.length > 0) {
        setSelectedEnrollment(res.data.data[0]);
      }
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      showMessage('error', 'Failed to load enrollments');
    }
  };

  const fetchPayments = async () => {
    try {
      const token = getToken();
      const res = await axios.get(`${API_URL}/payments/my-payments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPayments(res.data.data);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const canPurchaseCertificate = (enrollment) => {
    if (!enrollment.isCompleted) return false;
    const percentage = (enrollment.finalScore / (35 * 10)) * 100;
    return percentage >= 75 && !enrollment.certificatePurchased;
  };

  const handleInitiatePayment = async () => {
    if (!selectedEnrollment) {
      showMessage('error', 'Please select an internship');
      return;
    }

    setLoading(true);
    try {
      const token = getToken();
      const res = await axios.post(
        `${API_URL}/payments/initiate-certificate`,
        { enrollmentId: selectedEnrollment.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setSelectedPayment(res.data.data.payment);
        setShowInitiateModal(false);
        setShowUploadModal(true);
        showMessage('success', 'Payment initiated! Please upload proof.');
        fetchPayments();
      }
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadProof = async () => {
    if (!selectedPayment) {
      showMessage('error', 'No payment selected');
      return;
    }

    if (!uploadData.transactionId.trim()) {
      showMessage('error', 'Please enter transaction ID');
      return;
    }

    if (!uploadData.paymentProof) {
      showMessage('error', 'Please select payment proof image');
      return;
    }

    setLoading(true);
    try {
      const token = getToken();
      const formData = new FormData();
      formData.append('transactionId', uploadData.transactionId);
      formData.append('paymentProof', uploadData.paymentProof);

      const res = await axios.post(
        `${API_URL}/payments/${selectedPayment.id}/upload-proof`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (res.data.success) {
        showMessage('success', 'Payment proof uploaded! Waiting for admin verification.');
        setShowUploadModal(false);
        setUploadData({ transactionId: '', paymentProof: null });
        setSelectedPayment(null);
        fetchPayments();
      }
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Failed to upload proof');
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatus = (status) => {
    const statusMap = {
      PENDING: { icon: '⏳', color: '#FFA500', label: 'Pending Verification' },
      VERIFIED: { icon: '✅', color: '#4CAF50', label: 'Verified' },
      REJECTED: { icon: '❌', color: '#f44336', label: 'Rejected' }
    };
    return statusMap[status] || statusMap.PENDING;
  };

  const getScorePercentage = (enrollment) => {
    return Math.round((enrollment.finalScore / (35 * 10)) * 100);
  };

  return (
    <div className="payment-page">
      <div className="payment-header">
        <h1>💰 Certificate Payment</h1>
        <p>Complete your internship and purchase your certificate</p>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="payment-container">
        {/* Enrollments Section */}
        <div className="section">
          <h2>📚 My Internships</h2>
          <div className="enrollments-list">
            {enrollments.length === 0 ? (
              <p className="empty-state">No enrollments found</p>
            ) : (
              enrollments.map(enrollment => {
                const canBuy = canPurchaseCertificate(enrollment);
                const percentage = getScorePercentage(enrollment);

                return (
                  <div
                    key={enrollment.id}
                    className={`enrollment-item ${selectedEnrollment?.id === enrollment.id ? 'active' : ''}`}
                    onClick={() => setSelectedEnrollment(enrollment)}
                  >
                    <div className="enrollment-header">
                      <h3>{enrollment.internship.title}</h3>
                      {enrollment.certificatePurchased && (
                        <span className="badge-purchased">🎓 Purchased</span>
                      )}
                    </div>

                    <div className="enrollment-stats">
                      <div className="stat">
                        <span className="stat-label">Score:</span>
                        <span className="stat-value">{percentage}%</span>
                      </div>
                      <div className="stat">
                        <span className="stat-label">Tasks:</span>
                        <span className="stat-value">{enrollment.completedTasks}/{enrollment.totalTasks}</span>
                      </div>
                      <div className="stat">
                        <span className="stat-label">Price:</span>
                        <span className="stat-value">₹{enrollment.internship.certificatePrice}</span>
                      </div>
                    </div>

                    {enrollment.isCompleted ? (
                      <div className="completion-info">
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: '100%' }}></div>
                        </div>
                        <p style={{ color: '#4CAF50', fontWeight: '600', marginTop: '8px' }}>
                          ✅ Internship Completed!
                        </p>
                      </div>
                    ) : (
                      <div className="completion-info">
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${(enrollment.completedTasks / enrollment.totalTasks) * 100}%` }}
                          ></div>
                        </div>
                        <p style={{ color: '#666', marginTop: '8px' }}>
                          Complete all {enrollment.totalTasks} tasks to unlock certificate
                        </p>
                      </div>
                    )}

                    {canBuy && (
                      <button
                        className="btn-buy-certificate"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowInitiateModal(true);
                        }}
                      >
                        Buy Certificate for ₹{enrollment.internship.certificatePrice}
                      </button>
                    )}

                    {percentage < 75 && enrollment.isCompleted && (
                      <p style={{ color: '#f44336', fontSize: '13px', marginTop: '10px' }}>
                        ⚠️ Score {percentage}% is below 75% requirement
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Payment History */}
        <div className="section">
          <h2>📋 Payment History</h2>
          {payments.length === 0 ? (
            <p className="empty-state">No payments made yet</p>
          ) : (
            <div className="payments-list">
              {payments.map(payment => {
                const statusInfo = getPaymentStatus(payment.paymentStatus);

                return (
                  <div key={payment.id} className="payment-item">
                    <div className="payment-top">
                      <div className="payment-info">
                        <span className="payment-type">{payment.paymentType}</span>
                        <span className="payment-amount">₹{payment.amount}</span>
                      </div>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: statusInfo.color,
                          color: 'white'
                        }}
                      >
                        {statusInfo.icon} {statusInfo.label}
                      </span>
                    </div>

                    <div className="payment-details">
                      <div className="detail-row">
                        <span className="detail-label">Transaction ID:</span>
                        <span className="detail-value">
                          {payment.transactionId || 'Pending...'}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Date:</span>
                        <span className="detail-value">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {payment.paymentStatus === 'REJECTED' && payment.rejectionReason && (
                        <div className="rejection-reason">
                          <p style={{ margin: 0, color: '#f44336' }}>
                            <strong>Reason:</strong> {payment.rejectionReason}
                          </p>
                          <button
                            className="btn-retry-payment"
                            onClick={() => {
                              setSelectedPayment(null);
                              setShowInitiateModal(true);
                            }}
                          >
                            Retry Payment
                          </button>
                        </div>
                      )}

                      {payment.paymentStatus === 'PENDING' && payment.paymentProofUrl && (
                        <div className="pending-info">
                          <p style={{ margin: 0, color: '#FFA500' }}>
                            ⏳ Waiting for admin verification
                          </p>
                        </div>
                      )}

                      {payment.paymentStatus === 'VERIFIED' && (
                        <div className="verified-info">
                          <p style={{ margin: 0, color: '#4CAF50' }}>
                            ✅ Payment verified and certificate issued!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Initiate Payment Modal */}
      {showInitiateModal && selectedEnrollment && (
        <div className="modal-overlay" onClick={() => setShowInitiateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Certificate Purchase</h2>
              <button
                className="close-btn"
                onClick={() => setShowInitiateModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="payment-summary">
                <div className="summary-row">
                  <span>Internship:</span>
                  <strong>{selectedEnrollment.internship.title}</strong>
                </div>
                <div className="summary-row">
                  <span>Your Score:</span>
                  <strong>{getScorePercentage(selectedEnrollment)}%</strong>
                </div>
                <div className="summary-row">
                  <span>Certificate Price:</span>
                  <strong>₹{selectedEnrollment.internship.certificatePrice}</strong>
                </div>
                <div className="summary-divider"></div>
                <div className="summary-row total">
                  <span>Amount to Pay:</span>
                  <strong>₹{selectedEnrollment.internship.certificatePrice}</strong>
                </div>
              </div>

              <div className="payment-instructions">
                <h3>📲 Payment Instructions:</h3>
                <ol>
                  <li>Click "Proceed to Payment"</li>
                  <li>Take screenshot of payment proof</li>
                  <li>Upload the screenshot with transaction ID</li>
                  <li>Admin will verify within 24 hours</li>
                </ol>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowInitiateModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-proceed"
                onClick={handleInitiatePayment}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Proceed to Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Payment Proof Modal */}
      {showUploadModal && selectedPayment && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Upload Payment Proof</h2>
              <button
                className="close-btn"
                onClick={() => setShowUploadModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="upload-info">
                <p>
                  <strong>Payment ID:</strong> {selectedPayment.id}
                </p>
                <p>
                  <strong>Amount:</strong> ₹{selectedPayment.amount}
                </p>
              </div>

              <div className="form-group">
                <label>Transaction ID *</label>
                <input
                  type="text"
                  placeholder="Enter UPI Transaction ID (e.g., 202412011234567890)"
                  value={uploadData.transactionId}
                  onChange={(e) =>
                    setUploadData({ ...uploadData, transactionId: e.target.value })
                  }
                />
                <small>Find this in your payment app confirmation</small>
              </div>

              <div className="form-group">
                <label>Payment Proof Screenshot *</label>
                <div className="file-input">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setUploadData({ ...uploadData, paymentProof: e.target.files[0] })
                    }
                  />
                  <div className="file-preview">
                    {uploadData.paymentProof ? (
                      <span>✓ {uploadData.paymentProof.name}</span>
                    ) : (
                      <span>Choose payment screenshot</span>
                    )}
                  </div>
                </div>
                <small>Upload screenshot showing transaction ID, amount, and timestamp</small>
              </div>

              <div className="upload-requirements">
                <h4>✅ What to upload:</h4>
                <ul>
                  <li>Screenshot from UPI app showing successful payment</li>
                  <li>Transaction ID clearly visible</li>
                  <li>Amount paid (₹{selectedPayment.amount})</li>
                  <li>Timestamp of transaction</li>
                </ul>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowUploadModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-submit"
                onClick={handleUploadProof}
                disabled={loading || !uploadData.transactionId || !uploadData.paymentProof}
              >
                {loading ? 'Uploading...' : 'Submit for Verification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentPage;