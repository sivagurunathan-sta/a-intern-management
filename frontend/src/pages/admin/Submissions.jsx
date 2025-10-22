import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Submissions.css';

const Submissions = () => {
  const [submissions, setSubmissions] = useState([]);
  const [filter, setFilter] = useState('PENDING');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [reviewData, setReviewData] = useState({
    status: 'APPROVED',
    score: 10,
    feedback: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, [filter]);

  const fetchSubmissions = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/submissions?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubmissions(res.data.data.submissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  const handleReview = async (submissionId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5000/api/submissions/${submissionId}/review`,
        reviewData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Submission reviewed successfully!');
      setSelectedSubmission(null);
      fetchSubmissions();
      setReviewData({ status: 'APPROVED', score: 10, feedback: '' });
    } catch (error) {
      alert('Error reviewing submission: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      PENDING: '#FFA500',
      APPROVED: '#4CAF50',
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
    <div className="submissions-container">
      <div className="page-header">
        <h1>📝 Task Submissions</h1>
        <div className="filter-tabs">
          {['PENDING', 'APPROVED', 'REJECTED'].map(status => (
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

      <div className="submissions-table-wrapper">
        <table className="submissions-table">
          <thead>
            <tr>
              <th>Intern</th>
              <th>Task</th>
              <th>Internship</th>
              <th>Submission</th>
              <th>Submitted On</th>
              <th>Status</th>
              <th>Score</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map(sub => (
              <tr key={sub.id}>
                <td>
                  <div>
                    <div style={{ fontWeight: '600' }}>{sub.user.name}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>{sub.user.email}</div>
                  </div>
                </td>
                <td>Task #{sub.task.taskNumber}: {sub.task.title}</td>
                <td>{sub.task.internship?.title}</td>
                <td>
                  {sub.githubUrl && (
                    <a href={sub.githubUrl} target="_blank" rel="noopener noreferrer" className="link">
                      GitHub Link
                    </a>
                  )}
                  {sub.fileUrl && (
                    <a href={`http://localhost:5000${sub.fileUrl}`} target="_blank" rel="noopener noreferrer" className="link">
                      Download File
                    </a>
                  )}
                </td>
                <td>{new Date(sub.submissionDate).toLocaleDateString()}</td>
                <td>{getStatusBadge(sub.status)}</td>
                <td>{sub.score || '-'}</td>
                <td>
                  {sub.status === 'PENDING' && (
                    <button
                      className="btn-review"
                      onClick={() => setSelectedSubmission(sub)}
                    >
                      Review
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedSubmission && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Review Submission</h2>
            <div className="submission-details">
              <p><strong>Intern:</strong> {selectedSubmission.user.name}</p>
              <p><strong>Task:</strong> {selectedSubmission.task.title}</p>
              <p><strong>Submitted:</strong> {new Date(selectedSubmission.submissionDate).toLocaleString()}</p>
              {selectedSubmission.githubUrl && (
                <p>
                  <strong>GitHub:</strong>{' '}
                  <a href={selectedSubmission.githubUrl} target="_blank" rel="noopener noreferrer">
                    {selectedSubmission.githubUrl}
                  </a>
                </p>
              )}
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                value={reviewData.status}
                onChange={(e) => setReviewData({...reviewData, status: e.target.value})}
              >
                <option value="APPROVED">Approve</option>
                <option value="REJECTED">Reject</option>
              </select>
            </div>

            <div className="form-group">
              <label>Score (out of {selectedSubmission.task.points})</label>
              <input
                type="number"
                min="0"
                max={selectedSubmission.task.points}
                value={reviewData.score}
                onChange={(e) => setReviewData({...reviewData, score: parseInt(e.target.value)})}
                disabled={reviewData.status === 'REJECTED'}
              />
            </div>

            <div className="form-group">
              <label>Feedback</label>
              <textarea
                rows={4}
                value={reviewData.feedback}
                onChange={(e) => setReviewData({...reviewData, feedback: e.target.value})}
                placeholder="Provide feedback to the intern..."
              />
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setSelectedSubmission(null)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={() => handleReview(selectedSubmission.id)}
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Submissions;