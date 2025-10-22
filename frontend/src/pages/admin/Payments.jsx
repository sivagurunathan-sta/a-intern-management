import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Payments.css';

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
      const res = await axios.get(`http://localhost:5000/api/payments?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPayments(res.data.data.payments);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const handleVerify = async (paymentId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/payments/${paymentId}/verify`,
        { verifiedTransactionId: verificationData.verifiedTransactionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Payment verified successfully!');
      setSelectedPayment(null);
      fetchPayments();
    } catch (error) {
      alert('Error verifying payment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (paymentId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/payments/${paymentId}/reject`,
        { rejectionReason: verificationData.rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Payment rejected!');
      setSelectedPayment(null);
      fetchPayments();
    } catch (error) {
      alert('Error rejecting payment: ' + error.message);
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
        background: colors[status],
        color: 'white'
      }}>
        {status}
      </span>
    );
  };

  return (
    <div className="payments-container">
      <div className="page-header">
        <h1>💰 Payment Verification</h1>
        <div className="filter-tabs">
          {['PENDING', 'VERIFIED', 'REJECTED'].map(status => (
            <button
              key={status}
              className={filter === status ? 'tab-active' : 'tab'}
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
            {payments.map(payment => (
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
                <td>₹{payment.amount}</td>
                <td>{payment.transactionId || '-'}</td>
                <td>
                  {payment.paymentProofUrl ? (
                    <a
                      href={`http://localhost:5000${payment.paymentProofUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link"
                    >
                      View Proof
                    </a>
                  ) : '-'}
                </td>
                <td>{new Date(payment.createdAt).toLocaleDateString()}</td>
                <td>{getStatusBadge(payment.paymentStatus)}</td>
                <td>
                  {payment.paymentStatus === 'PENDING' && (
                    <button
                      className="btn-verify"
                      onClick={() => setSelectedPayment(payment)}
                    >
                      Verify
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedPayment && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Verify Payment</h2>
            <div className="payment-details">
              <p><strong>User:</strong> {selectedPayment.user.name}</p>
              <p><strong>Amount:</strong> ₹{selectedPayment.amount}</p>
              <p><strong>Type:</strong> {selectedPayment.paymentType}</p>
              <p><strong>Transaction ID:</strong> {selectedPayment.transactionId}</p>
              {selectedPayment.paymentProofUrl && (
                <div>
                  <strong>Payment Proof:</strong>
                  <img
                    src={`http://localhost:5000${selectedPayment.paymentProofUrl}`}
                    alt="Payment Proof"
                    style={{ width: '100%', maxWidth: '400px', marginTop: '10px', borderRadius: '8px' }}
                  />
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Verified Transaction ID</label>
              <input
                type="text"
                value={verificationData.verifiedTransactionId}
                onChange={(e) => setVerificationData({...verificationData, verifiedTransactionId: e.target.value})}
                placeholder="Enter verified transaction ID"
              />
            </div>

            <div className="form-group">
              <label>Rejection Reason (if rejecting)</label>
              <textarea
                rows={3}
                value={verificationData.rejectionReason}
                onChange={(e) => setVerificationData({...verificationData, rejectionReason: e.target.value})}
                placeholder="Enter reason for rejection"
              />
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setSelectedPayment(null)}>
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={() => handleReject(selectedPayment.id)}
                disabled={loading || !verificationData.rejectionReason}
              >
                Reject
              </button>
              <button
                className="btn-primary"
                onClick={() => handleVerify(selectedPayment.id)}
                disabled={loading || !verificationData.verifiedTransactionId}
              >
                {loading ? 'Processing...' : 'Verify'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;