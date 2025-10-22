// frontend/src/pages/admin/PaymentVerification.jsx - COMPLETE
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PaymentVerification.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const PaymentVerification = () => {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [verificationData, setVerificationData] = useState({
    verifiedTransactionId: '',
    rejectionReason: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const getToken = () => localStorage.getItem('token') || localStorage.getItem('authToken');

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  useEffect(() => {
    filterPayments();
  }, [payments, statusFilter]);

  const fetchPayments = async () => {
    try {
      const token = getToken();
      const res = await axios.get(`${API_URL}/payments?status=${statusFilter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPayments(res.data.data.payments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      showMessage('error', 'Failed to load payments');
    }
  };

  const filterPayments = () => {
    const filtered = payments.filter(p => p.paymentStatus === statusFilter);
    setFilteredPayments(filtered);
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const openPaymentDetails = (payment) => {
    setSelectedPayment(payment);
    setVerificationData({
      verifiedTransactionId: '',
      rejectionReason: ''
    });
    setShowDetailModal(true);
  };

  const handleVerifyPayment = async () => {
    if (!verificationData.verifiedTransactionId.trim()) {
      showMessage('error', 'Please enter verified transaction ID');
      return;
    }

    setLoading(true);
    try {
      const token = getToken();
      const res = await axios.post(
        `${API_URL}/payments/${selectedPayment.id}/verify`,
        { verifiedTransactionId: verificationData.verifiedTransactionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        showMessage('success', 'Payment verified successfully! Certificate issued to intern.');
        setShowDetailModal(false);
        fetchPayments();
      }
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Failed to verify payment');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!verificationData.rejectionReason.trim()) {
      showMessage('error', 'Please provide rejection reason');
      return;
    }

    setLoading(true);
    try {
      const token = getToken();
      const res = await axios.post(
        `${API_URL}/payments/${selectedPayment.id}/reject`,
        { rejectionReason: verificationData.rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        showMessage('success', 'Payment rejected. Intern has been notified.');
        setShowDetailModal(false);
        fetchPayments();
      }
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Failed to reject payment');
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatusBadge = (status) => {
    const statusMap = {
      PENDING: { icon: '⏳', color: '#FFA500', label: 'Pending' },
      VERIFIED: { icon: '✅', color: '#4CAF50', label: 'Verified' },
      REJECTED: { icon: '❌', color: '#f44336', label: 'Rejected' }
    };
    return statusMap[status] || statusMap.PENDING;
  };

  return (
    <div className="payment-verification-page">
      <div className="verification-header">
        <h1>💳 Payment Verification</h1>
        <p>Review and verify intern payment submissions</p>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="filter-tabs">
        {['PENDING', 'VERIFIED', 'REJECTED'].map(status => (
          <button
            key={status}
            className={`tab ${statusFilter === status ? 'active' : ''}`}
            onClick={() => setStatusFilter(status)}
          >
            {status === 'PENDING' && `⏳ Pending (${payments.filter(p => p.paymentStatus === 'PENDING').length})`}
            {status === 'VERIFIED' && `✅ Verified (${payments.filter(p => p.paymentStatus === 'VERIFIED').length})`}
            {status === 'REJECTED' && `❌ Rejected (${payments.filter(p => p.paymentStatus === 'REJECTED').length})`}
          </button>
        ))}
      </div>

      {filteredPayments.length === 0 ? (
        <div className="empty-state">
          <p>No {statusFilter.toLowerCase()} payments</p>
        </div>
      ) : (
        <div className="payments-table-wrapper">
          <table className="payments-table">
            <thead>
              <tr>
                <th>Intern</th>
                <th>Amount</th>
                <th>Transaction ID</th>
                <th>Type</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map(payment => {
                const statusInfo = getPaymentStatusBadge(payment.paymentStatus);

                return (
                  <tr key={payment.id}>
                    <td>
                      <div className="intern-info">
                        <strong>{payment.user.name}</strong>
                        <small>{payment.user.email}</small>
                      </div>
                    </td>
                    <td>
                      <strong>₹{payment.amount}</strong>
                    </td>
                    <td>
                      <code>{payment.transactionId || '-'}</code>
                    </td>
                    <td>
                      <span className="type-badge">{payment.paymentType}</span>
                    </td>
                    <td>
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ backgroundColor: statusInfo.color, color: 'white' }}
                      >
                        {statusInfo.icon} {statusInfo.label}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-review"
                        onClick={() => openPaymentDetails(payment)}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showDetailModal && selectedPayment && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Review Payment</h2>
              <button
                className="close-btn"
                onClick={() => setShowDetailModal(false)}
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
                    <span>{selectedPayment.user.name}</span>
                  </div>
                  <div className="info-item">
                    <label>Email:</label>
                    <span>{selectedPayment.user.email}</span>
                  </div>
                </div>
              </div>

              <div className="section">
                <h3>💰 Payment Details</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Amount:</label>
                    <span className="highlight">₹{selectedPayment.amount}</span>
                  </div>
                  <div className="info-item">
                    <label>Type:</label>
                    <span>{selectedPayment.paymentType}</span>
                  </div>
                  <div className="info-item">
                    <label>Submitted On:</label>
                    <span>{new Date(selectedPayment.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="info-item">
                    <label>Transaction ID (Intern):</label>
                    <span className="transaction-id">{selectedPayment.transactionId}</span>
                  </div>
                </div>
              </div>

              {selectedPayment.paymentProofUrl && (
                <div className="section">
                  <h3>📸 Payment Proof Screenshot</h3>
                  <div className="payment-proof">
                    <img
                      src={`http://localhost:5000${selectedPayment.paymentProofUrl}`}
                      alt="Payment Proof"
                    />
                  </div>
                </div>
              )}

              {selectedPayment.paymentStatus === 'PENDING' && (
                <>
                  <div className="section">
                    <h3>✅ Approve Payment</h3>
                    <div className="form-group">
                      <label>Verified Transaction ID *</label>
                      <input
                        type="text"
                        placeholder="Enter verified transaction ID"
                        value={verificationData.verifiedTransactionId}
                        onChange={(e) =>
                          setVerificationData({
                            ...verificationData,
                            verifiedTransactionId: e.target.value
                          })
                        }
                      />
                      <small>Confirm transaction ID matches</small>
                    </div>
                    <div className="verification-checklist">
                      <h4>Verification Checklist:</h4>
                      <ul>
                        <li>✓ Amount matches (₹{selectedPayment.amount})</li>
                        <li>✓ Transaction ID valid</li>
                        <li>✓ Payment proof clear</li>
                        <li>✓ Timestamp within 24 hours</li>
                      </ul>
                    </div>
                  </div>

                  <div className="section">
                    <h3>❌ Reject Payment</h3>
                    <div className="form-group">
                      <label>Rejection Reason *</label>
                      <textarea
                        rows={3}
                        placeholder="Explain rejection reason..."
                        value={verificationData.rejectionReason}
                        onChange={(e) =>
                          setVerificationData({
                            ...verificationData,
                            rejectionReason: e.target.value
                          })
                        }
                      />
                      <small>Intern will receive this message</small>
                    </div>
                  </div>
                </>
              )}

              {selectedPayment.paymentStatus === 'VERIFIED' && (
                <div className="section success-section">
                  <h3>✅ Payment Verified</h3>
                  <p>
                    <strong>Verified Transaction ID:</strong>
                  </p>
                  <code style={{ backgroundColor: '#f0f0f0', padding: '8px', borderRadius: '4px', display: 'block' }}>
                    {selectedPayment.verifiedTransactionId}
                  </code>
                  <p style={{ marginTop: '10px' }}>
                    <strong>Verified At:</strong> {new Date(selectedPayment.verifiedAt).toLocaleString()}
                  </p>
                  <p style={{ color: '#4CAF50', marginTop: '15px', fontWeight: '600' }}>
                    ✓ Certificate issued to intern
                  </p>
                </div>
              )}

              {selectedPayment.paymentStatus === 'REJECTED' && (
                <div className="section rejected-section">
                  <h3>❌ Payment Rejected</h3>
                  <p>
                    <strong>Rejection Reason:</strong>
                  </p>
                  <div style={{ backgroundColor: '#ffebee', padding: '10px', borderRadius: '4px', color: '#c62828' }}>
                    {selectedPayment.rejectionReason}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowDetailModal(false)}
              >
                Close
              </button>

              {selectedPayment.paymentStatus === 'PENDING' && (
                <>
                  <button
                    className="btn-reject"
                    onClick={handleRejectPayment}
                    disabled={loading || !verificationData.rejectionReason}
                  >
                    {loading ? 'Rejecting...' : 'Reject Payment'}
                  </button>
                  <button
                    className="btn-approve"
                    onClick={handleVerifyPayment}
                    disabled={loading || !verificationData.verifiedTransactionId}
                  >
                    {loading ? 'Verifying...' : 'Approve & Issue Certificate'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentVerification;