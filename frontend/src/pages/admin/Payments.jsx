// frontend/src/pages/admin/Payments.jsx - FIXED TO MATCH BACKEND
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Payments.css';

const API_URL = 'http://localhost:5000/api';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState('PENDING');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [verificationData, setVerificationData] = useState({
    verifiedTransactionId: '',
    rejectionReason: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, [filter]);

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/payments?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPayments(res.data.data.payments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      alert('Error fetching payments: ' + error.message);
    }
  };

  const handleVerify = async (paymentId) => {
    if (!verificationData.verifiedTransactionId.trim()) {
      alert('Please enter verified transaction ID');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/payments/${paymentId}/verify`,
        { verifiedTransactionId: verificationData.verifiedTransactionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('✅ Payment verified successfully! Certificate session created.');
      setSelectedPayment(null);
      setVerificationData({ verifiedTransactionId: '', rejectionReason: '' });
      fetchPayments();
    } catch (error) {
      alert('Error verifying payment: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (paymentId) => {
    if (!verificationData.rejectionReason.trim()) {
      alert('Please enter rejection reason');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/payments/${paymentId}/reject`,
        { rejectionReason: verificationData.rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('❌ Payment rejected successfully!');
      setSelectedPayment(null);
      setVerificationData({ verifiedTransactionId: '', rejectionReason: '' });
      fetchPayments();
    } catch (error) {
      alert('Error rejecting payment: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      PENDING: '#FFA500',
      VERIFIED: '#4CAF50',
      REJECTED: '#f44336'
    };
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        background: colors[status] || '#999',
        color: 'white'
      }}>
        {status}
      </span>
    );
  };

  return (
    <div className="payments-container">
      <div className="page-header">
        <div>
          <h1>💰 Payment Verification</h1>
          <p>Verify intern payments and create certificate sessions</p>
        </div>
        <div className="filter-tabs" style={{ display: 'flex', gap: '10px' }}>
          {['PENDING', 'VERIFIED', 'REJECTED'].map(status => (
            <button
              key={status}
              style={{
                padding: '10px 20px',
                background: filter === status ? '#4CAF50' : '#e0e0e0',
                color: filter === status ? 'white' : '#333',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.3s'
              }}
              onClick={() => setFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="payments-table-wrapper">
        <table className="payments-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Transaction ID</th>
              <th>Payment Proof</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  No {filter.toLowerCase()} payments found
                </td>
              </tr>
            ) : (
              payments.map(payment => (
                <tr key={payment.id}>
                  <td>
                    <div>
                      <div style={{ fontWeight: '600' }}>{payment.user.name}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>{payment.user.email}</div>
                    </div>
                  </td>
                  <td>
                    <span className="type-badge">{payment.paymentType}</span>
                  </td>
                  <td style={{ fontWeight: '600' }}>₹{payment.amount}</td>
                  <td style={{ fontSize: '13px', color: '#666' }}>
                    {payment.transactionId || '-'}
                  </td>
                  <td>
                    {payment.paymentProofUrl ? (
                      <a
                        href={`${API_URL.replace('/api', '')}${payment.paymentProofUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#2196F3',
                          textDecoration: 'none',
                          fontWeight: '600',
                          fontSize: '13px'
                        }}
                      >
                        📄 View Proof
                      </a>
                    ) : (
                      <span style={{ color: '#999' }}>-</span>
                    )}
                  </td>
                  <td style={{ fontSize: '13px', color: '#666' }}>
                    {new Date(payment.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td>{getStatusBadge(payment.paymentStatus)}</td>
                  <td>
                    {payment.paymentStatus === 'PENDING' && (
                      <button
                        className="btn-verify"
                        onClick={() => {
                          setSelectedPayment(payment);
                          setVerificationData({ verifiedTransactionId: '', rejectionReason: '' });
                        }}
                      >
                        ✅ Verify
                      </button>
                    )}
                    {payment.paymentStatus === 'REJECTED' && (
                      <span style={{ fontSize: '12px', color: '#f44336' }}>
                        {payment.rejectionReason}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedPayment && (
        <div className="modal-overlay" onClick={() => setSelectedPayment(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div style={{ borderBottom: '2px solid #f0f0f0', paddingBottom: '15px', marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 5px 0' }}>💳 Verify Payment</h2>
              <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                Review payment details and approve/reject
              </p>
            </div>

            <div className="payment-details">
              <p><strong>User:</strong> {selectedPayment.user.name} ({selectedPayment.user.email})</p>
              <p><strong>Amount:</strong> ₹{selectedPayment.amount}</p>
              <p><strong>Type:</strong> {selectedPayment.paymentType}</p>
              <p><strong>Submitted Transaction ID:</strong> {selectedPayment.transactionId}</p>
              <p><strong>Date:</strong> {new Date(selectedPayment.createdAt).toLocaleString('en-IN')}</p>
              
              {selectedPayment.internship && (
                <p><strong>Internship:</strong> {selectedPayment.internship.title}</p>
              )}
              
              {selectedPayment.paidTask && (
                <p><strong>Paid Task:</strong> {selectedPayment.paidTask.title}</p>
              )}

              {selectedPayment.paymentProofUrl && (
                <div style={{ marginTop: '15px' }}>
                  <strong>Payment Proof:</strong>
                  <div style={{ marginTop: '10px' }}>
                    <img
                      src={`${API_URL.replace('/api', '')}${selectedPayment.paymentProofUrl}`}
                      alt="Payment Proof"
                      style={{ 
                        width: '100%', 
                        maxWidth: '500px', 
                        borderRadius: '8px',
                        border: '2px solid #e0e0e0'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>✅ Verified Transaction ID</label>
              <input
                type="text"
                value={verificationData.verifiedTransactionId}
                onChange={(e) => setVerificationData({
                  ...verificationData, 
                  verifiedTransactionId: e.target.value
                })}
                placeholder="Enter verified transaction ID to approve"
              />
              <p style={{ fontSize: '12px', color: '#666', margin: '5px 0 0 0' }}>
                Enter the transaction ID to approve this payment
              </p>
            </div>

            <div className="form-group">
              <label>❌ Rejection Reason (optional)</label>
              <textarea
                rows={3}
                value={verificationData.rejectionReason}
                onChange={(e) => setVerificationData({
                  ...verificationData, 
                  rejectionReason: e.target.value
                })}
                placeholder="Enter reason if rejecting this payment"
              />
            </div>

            <div className="modal-actions">
              <button 
                className="btn-secondary" 
                onClick={() => setSelectedPayment(null)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={() => handleReject(selectedPayment.id)}
                disabled={loading || !verificationData.rejectionReason.trim()}
              >
                {loading ? '⏳ Processing...' : '❌ Reject'}
              </button>
              <button
                className="btn-primary"
                onClick={() => handleVerify(selectedPayment.id)}
                disabled={loading || !verificationData.verifiedTransactionId.trim()}
              >
                {loading ? '⏳ Processing...' : '✅ Verify & Create Certificate Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;