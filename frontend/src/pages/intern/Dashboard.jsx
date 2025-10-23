// frontend/src/pages/intern/Dashboard.jsx - WITH CERTIFICATES MERGED
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // ✅ ADD THIS IMPORT
import './Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const InternDashboard = () => {
  const navigate = useNavigate(); // ✅ ADD THIS
  const [profile, setProfile] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [availableInternships, setAvailableInternships] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showUnenrollModal, setShowUnenrollModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [unenrollTarget, setUnenrollTarget] = useState(null);
  const [submissionData, setSubmissionData] = useState({
    githubUrl: '',
    formData: '',
    file: null
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [paymentProof, setPaymentProof] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('current');
  const [notifications, setNotifications] = useState([]);
  
  const selectedEnrollmentIdRef = useRef(null);
  const pollIntervalRef = useRef(null);

  const getToken = () => localStorage.getItem('token') || localStorage.getItem('authToken');

  // ============================================================================
  // FETCH FUNCTIONS
  // ============================================================================

  const fetchProfile = useCallback(async () => {
    try {
      const token = getToken();
      const res = await axios.get(`${API_URL}/intern/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(res.data.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }, []);

  const fetchEnrollments = useCallback(async () => {
    try {
      const token = getToken();
      const res = await axios.get(`${API_URL}/intern/enrollments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success && Array.isArray(res.data.data)) {
        const validEnrollments = res.data.data.filter(e => e && e.internship && e.internship.id);
        setEnrollments(validEnrollments);
        
        if (validEnrollments.length > 0) {
          if (selectedEnrollmentIdRef.current) {
            const stillExists = validEnrollments.find(e => e.id === selectedEnrollmentIdRef.current);
            if (stillExists) {
              setSelectedEnrollment(stillExists);
            } else {
              const firstActive = validEnrollments.find(e => !e.isCompleted) || validEnrollments[0];
              setSelectedEnrollment(firstActive);
              selectedEnrollmentIdRef.current = firstActive.id;
            }
          } else {
            const firstActive = validEnrollments.find(e => !e.isCompleted) || validEnrollments[0];
            setSelectedEnrollment(firstActive);
            selectedEnrollmentIdRef.current = firstActive.id;
          }
        } else {
          setSelectedEnrollment(null);
          selectedEnrollmentIdRef.current = null;
          setTasks([]);
        }
      }
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      setEnrollments([]);
    }
  }, []);

  const fetchAvailableInternships = useCallback(async () => {
    try {
      const token = getToken();
      const res = await axios.get(`${API_URL}/internships`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success && Array.isArray(res.data.data)) {
        const validInternships = res.data.data.filter(i => i && i.id && i.title && i.isActive !== false);
        setAvailableInternships(validInternships);
      }
    } catch (error) {
      console.error('Error fetching available internships:', error);
      setAvailableInternships([]);
    }
  }, []);

  const fetchTasks = useCallback(async (internshipId) => {
    try {
      const token = getToken();
      const res = await axios.get(`${API_URL}/intern/internship/${internshipId}/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.data && Array.isArray(res.data.data)) {
        const validTasks = res.data.data.filter(t => t && t.id && t.title);
        setTasks(validTasks);
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setTasks([]);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = getToken();
      const res = await axios.get(`${API_URL}/intern/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success && Array.isArray(res.data.data)) {
        setNotifications(res.data.data.slice(0, 10));
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  // ============================================================================
  // INITIAL LOAD
  // ============================================================================

  useEffect(() => {
    fetchProfile();
    fetchEnrollments();
    fetchAvailableInternships();
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (selectedEnrollment && selectedEnrollment.internship?.id) {
      fetchTasks(selectedEnrollment.internship.id);
    }
  }, [selectedEnrollment?.internship?.id, fetchTasks]);

  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const handleEnroll = async (internshipId) => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await axios.post(
        `${API_URL}/internships/${internshipId}/enroll`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        alert('✅ Enrolled successfully!');
        setShowEnrollModal(false);
        await fetchEnrollments();
        await fetchAvailableInternships();
      }
    } catch (error) {
      alert('❌ ' + (error.response?.data?.message || 'Failed to enroll'));
    } finally {
      setLoading(false);
    }
  };

  const openUnenrollModal = (enrollment, event) => {
    if (event) {
      event.stopPropagation();
    }
    console.log('Opening unenroll modal for:', enrollment.internship?.title);
    console.log('Enrollment ID:', enrollment.id);
    setUnenrollTarget(enrollment);
    setShowUnenrollModal(true);
  };

  const handleUnenroll = async () => {
    if (!unenrollTarget || !unenrollTarget.id) {
      alert('❌ Invalid enrollment data');
      return;
    }

    setLoading(true);
    try {
      const token = getToken();
      console.log('Unenrolling enrollment ID:', unenrollTarget.id);
      
      const res = await axios.delete(
        `${API_URL}/internships/${unenrollTarget.id}/unenroll`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        alert('✅ Successfully unenrolled from ' + unenrollTarget.internship.title);
        
        if (selectedEnrollment?.id === unenrollTarget.id) {
          setSelectedEnrollment(null);
          selectedEnrollmentIdRef.current = null;
          setTasks([]);
        }
        
        setShowUnenrollModal(false);
        setUnenrollTarget(null);
        
        await fetchEnrollments();
        await fetchAvailableInternships();
      }
    } catch (error) {
      console.error('Unenroll error:', error);
      alert('❌ ' + (error.response?.data?.message || 'Failed to unenroll'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTask = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const formData = new FormData();
      
      if (submissionData.githubUrl) {
        formData.append('githubUrl', submissionData.githubUrl);
      }
      if (submissionData.formData) {
        formData.append('formData', submissionData.formData);
      }
      if (submissionData.file) {
        formData.append('file', submissionData.file);
      }

      await axios.post(
        `${API_URL}/submissions/task/${selectedTask.id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      alert('✅ Task submitted successfully!');
      setShowSubmitModal(false);
      setSubmissionData({ githubUrl: '', formData: '', file: null });
      fetchTasks(selectedEnrollment.internship.id);
      fetchEnrollments();
    } catch (error) {
      alert('❌ Error submitting task: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const initiatePayment = async () => {
    try {
      const token = getToken();
      const res = await axios.post(
        `${API_URL}/payments/initiate-certificate`,
        { enrollmentId: selectedEnrollment.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPaymentDetails(res.data.data);
      setShowPaymentModal(true);
    } catch (error) {
      alert('❌ Error initiating payment: ' + (error.response?.data?.message || error.message));
    }
  };

  const uploadPaymentProof = async () => {
    if (!transactionId || transactionId.trim() === '') {
      alert('⚠️ TRANSACTION ID IS MANDATORY!\n\n❌ Please enter your payment transaction ID before submitting.\n\nThis is required for payment verification.');
      return;
    }

    if (!paymentProof) {
      alert('⚠️ PAYMENT PROOF SCREENSHOT IS MANDATORY!\n\n❌ Please upload your payment screenshot before submitting.\n\nThis is required for payment verification.');
      return;
    }

    setLoading(true);
    try {
      const token = getToken();
      const formData = new FormData();
      formData.append('paymentProof', paymentProof);
      formData.append('transactionId', transactionId.trim());
      formData.append('enrollmentId', paymentDetails.enrollmentId);
      formData.append('internshipId', paymentDetails.internshipId);
      formData.append('amount', paymentDetails.amount);

      await axios.post(
        `${API_URL}/payments/upload-proof`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      alert('✅ Payment proof uploaded successfully!\n\nYour payment is now pending admin verification.\nYou will be notified once it is verified.');
      setShowPaymentModal(false);
      setPaymentProof(null);
      setTransactionId('');
      setPaymentDetails(null);
      fetchEnrollments();
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      alert('❌ Error uploading payment proof:\n\n' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEnrollment = (enrollment) => {
    console.log('Manually selected:', enrollment.internship?.title);
    setSelectedEnrollment(enrollment);
    selectedEnrollmentIdRef.current = enrollment.id;
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getTaskStatusBadge = (task) => {
    if (!task.isUnlocked) {
      return <span className="badge-locked">🔒 Locked</span>;
    }
    if (!task.submission) {
      return <span className="badge-pending">⏳ Not Submitted</span>;
    }
    if (task.submission.status === 'PENDING') {
      return <span className="badge-review">👀 Under Review</span>;
    }
    if (task.submission.status === 'APPROVED') {
      return <span className="badge-approved">✅ Approved</span>;
    }
    if (task.submission.status === 'REJECTED') {
      return <span className="badge-rejected">❌ Rejected</span>;
    }
    return null;
  };

  const canPurchaseCertificate = () => {
    if (!selectedEnrollment || !selectedEnrollment.internship) return false;
    
    const totalTasks = selectedEnrollment.totalTasks || tasks.length;
    const maxPossibleScore = totalTasks * 10;
    const actualScore = selectedEnrollment.finalScore || 0;
    const percentage = maxPossibleScore > 0 ? (actualScore / maxPossibleScore) * 100 : 0;
    
    console.log('Certificate Check:', {
      totalTasks,
      maxPossibleScore,
      actualScore,
      percentage,
      passPercentage: selectedEnrollment.internship.passPercentage || 75,
      isCompleted: selectedEnrollment.isCompleted,
      certificatePurchased: selectedEnrollment.certificatePurchased
    });
    
    return selectedEnrollment.isCompleted && 
           percentage >= (selectedEnrollment.internship.passPercentage || 75) &&
           !selectedEnrollment.certificatePurchased;
  };

  const getNotEnrolledInternships = () => {
    const enrolledIds = enrollments.map(e => e.internship?.id).filter(Boolean);
    return availableInternships.filter(i => !enrolledIds.includes(i.id));
  };

  const activeEnrollments = enrollments.filter(e => !e.isCompleted);
  const completedEnrollments = enrollments.filter(e => e.isCompleted);

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (!profile) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading Dashboard</p>
      </div>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="intern-dashboard">
      {/* ✅ UPDATED HEADER WITH CERTIFICATES BUTTON */}
      <div className="dashboard-header">
        <div className="header-left">
          <div className="logo-section">
            <div className="logo-icon">📚</div>
            <div className="profile-greeting">
              <h1>Welcome back, <span className="name">{profile.name}</span></h1>
              <p className="user-id">{profile.userId}</p>
            </div>
          </div>
        </div>
        <div className="header-right">
          {/* ✅ NEW: Certificates Button */}
          <button 
            className="btn-enroll-new" 
            onClick={() => navigate('/certificates')}
            title="View your certificates"
          >
            🎓 My Certificates
          </button>
          
          <button className="btn-enroll-new" onClick={() => setShowEnrollModal(true)}>
            <span>+</span> New Internship
          </button>
          <div className="header-divider"></div>
          <button className="btn-logout" onClick={() => setShowLogoutModal(true)} title="Sign Out">
            🚪
          </button>
        </div>
      </div>

      {/* Enrollments Section */}
      {enrollments.length > 0 && (
        <div className="enrollments-section">
          <div className="section-header">
            <h2>📚 My Internships</h2>
            <div className="tab-buttons">
              <button 
                className={`tab-btn ${activeTab === 'current' ? 'active' : ''}`}
                onClick={() => setActiveTab('current')}
              >
                Active <span className="badge">{activeEnrollments.length}</span>
              </button>
              <button 
                className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
                onClick={() => setActiveTab('completed')}
              >
                Completed <span className="badge">{completedEnrollments.length}</span>
              </button>
            </div>
          </div>

          <div className="enrollment-cards">
            {(activeTab === 'current' ? activeEnrollments : completedEnrollments).length > 0 ? (
              (activeTab === 'current' ? activeEnrollments : completedEnrollments).map(enrollment => (
                <div
                  key={enrollment.id}
                  className={`enrollment-card ${selectedEnrollment?.id === enrollment.id ? 'active' : ''}`}
                  onClick={() => handleSelectEnrollment(enrollment)}
                >
                  <div className="card-image-wrapper">
                    {enrollment.internship?.coverImage && (
                      <img 
                        src={`http://localhost:5000${enrollment.internship.coverImage}`} 
                        alt={enrollment.internship?.title || 'Internship'}
                        className="enrollment-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    {enrollment.isCompleted && <div className="completed-badge">✅ Completed</div>}
                    <button 
                      className="btn-unenroll-card"
                      onClick={(e) => openUnenrollModal(enrollment, e)}
                      title="Unenroll from this internship"
                    >
                      ×
                    </button>
                  </div>
                  <div className="card-content">
                    <h3>{enrollment.internship?.title || 'Internship'}</h3>
                    
                    {!enrollment.isCompleted && (
                      <>
                        <div className="progress-info">
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${enrollment.progress}%` }}></div>
                          </div>
                          <span className="progress-text">{enrollment.progress}% Complete</span>
                        </div>
                        <div className="enrollment-stats">
                          <div className="stat">
                            <span className="stat-label">Tasks</span>
                            <span className="stat-value">{enrollment.completedTasks}/{enrollment.totalTasks}</span>
                          </div>
                          <div className="stat">
                            <span className="stat-label">Points</span>
                            <span className="stat-value">{enrollment.currentPoints}/{enrollment.totalPoints}</span>
                          </div>
                        </div>
                      </>
                    )}
                    
                    {enrollment.isCompleted && (
                      <div className="completion-info">
                        <p className="completion-score">Final Score: <span>{enrollment.finalScore || 0}%</span></p>
                        <p className="completion-date">✅ All tasks completed</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>📭 No {activeTab === 'current' ? 'active' : 'completed'} internships</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Enrollments State */}
      {enrollments.length === 0 && (
        <div className="empty-hero">
          <div className="empty-content">
            <h3>🎓 Get Started with Your First Internship</h3>
            <p>Explore and enroll in available internships to begin your learning journey</p>
            <button className="btn-primary-large" onClick={() => setShowEnrollModal(true)}>
              ✨ Explore Internships
            </button>
          </div>
        </div>
      )}

      {selectedEnrollment?.isCompleted && selectedEnrollment?.internship && (
        <div className="certificate-section">
          {(() => {
            const totalTasks = selectedEnrollment.totalTasks || tasks.length;
            const maxPossibleScore = totalTasks * 10;
            const actualScore = selectedEnrollment.finalScore || 0;
            const percentage = maxPossibleScore > 0 ? Math.round((actualScore / maxPossibleScore) * 100) : 0;
            const passPercentage = selectedEnrollment.internship.passPercentage || 75;
            const canPurchase = percentage >= passPercentage && !selectedEnrollment.certificatePurchased;

            return canPurchase ? (
              <div className="certificate-cta">
                <h3>🎉 You have earned your certificate</h3>
                <p className="certificate-score">
                  Score: <span>{percentage}%</span> ({actualScore}/{maxPossibleScore} points)
                </p>
                <button className="btn-primary-large" onClick={initiatePayment}>
                  🎓 Get Certificate • ₹{selectedEnrollment.internship.certificatePrice || 499}
                </button>
              </div>
            ) : selectedEnrollment.certificatePurchased ? (
              <div className="certificate-purchased">
                <h3>✅ Certificate Purchased</h3>
                <p>Your certificate will be ready soon</p>
              </div>
            ) : (
              <div className="certificate-cta">
                <h3>📊 Internship Completed</h3>
                <p className="certificate-score">
                  Your Score: <span>{percentage}%</span> ({actualScore}/{maxPossibleScore} points)
                </p>
                <p style={{color: '#e74c3c', fontSize: '14px', marginTop: '10px'}}>
                  ❌ You need {passPercentage}% to purchase the certificate. You scored {percentage}%.
                </p>
              </div>
            );
          })()}
        </div>
      )}

      {/* Tasks Section */}
      {selectedEnrollment && selectedEnrollment.internship && (
        <div className="tasks-section">
          <div className="tasks-header">
            <h2>📋 Tasks: {selectedEnrollment.internship.title}</h2>
            <span className="task-count">{tasks.filter(t => t.submission?.status === 'APPROVED').length}/{tasks.length}</span>
          </div>
          
          {tasks.length > 0 ? (
            <div className="tasks-grid">
              {tasks.map(task => (
                <div key={task.id} className="task-card">
                  <div className="task-header-row">
                    <h4>Task #{task.taskNumber || 1}</h4>
                    {getTaskStatusBadge(task)}
                  </div>
                  <h5>{task.title}</h5>
                  <p className="task-desc">{task.description}</p>
                  
                  {task.videoUrl && (
                    <div className="task-video">
                      {task.videoUrl.includes('youtube.com') || task.videoUrl.includes('youtu.be') ? (
                        <a href={task.videoUrl} target="_blank" rel="noopener noreferrer" className="video-link">
                          🎥 Watch Video
                        </a>
                      ) : (
                        <video controls style={{width: '100%', borderRadius: '8px', marginTop: '10px'}}>
                          <source src={`http://localhost:5000${task.videoUrl}`} type="video/mp4" />
                        </video>
                      )}
                    </div>
                  )}

                  {task.files && task.files.length > 0 && (
                    <div className="task-files">
                      <p><strong>📄 Materials</strong></p>
                      {task.files.map((file, index) => (
                        <a 
                          key={index}
                          href={`http://localhost:5000${file.url}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="file-link"
                        >
                          📎 {file.name}
                        </a>
                      ))}
                    </div>
                  )}
                  
                  {task.submission?.adminFeedback && (
                    <div className="admin-feedback">
                      <strong>💬 Feedback:</strong> 
                      <p>{task.submission.adminFeedback}</p>
                    </div>
                  )}

                  {task.isUnlocked && task.canSubmit && (
                    <button
                      className="btn-submit"
                      onClick={() => {
                        setSelectedTask(task);
                        setShowSubmitModal(true);
                      }}
                    >
                      {task.submission?.status === 'REJECTED' ? '🔄 Resubmit Task' : '📤 Submit Task'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>📭 No tasks available</p>
            </div>
          )}
        </div>
      )}

      {/* ===== MODALS ===== */}

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="modal-content logout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🚪 Sign Out</h2>
              <button className="close-btn" onClick={() => setShowLogoutModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to sign out?</p>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowLogoutModal(false)}>
                Cancel
              </button>
              <button className="btn-logout-confirm" onClick={handleLogout}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enroll Modal */}
      {showEnrollModal && (
        <div className="modal-overlay" onClick={() => setShowEnrollModal(false)}>
          <div className="modal-content enroll-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📚 Available Internships</h2>
              <button className="close-btn" onClick={() => setShowEnrollModal(false)}>×</button>
            </div>
            
            <p className="modal-subtitle">
              {getNotEnrolledInternships().length === 0 
                ? '✅ You are enrolled in all available internships' 
                : `${getNotEnrolledInternships().length} internship(s) available to enroll`
              }
            </p>

            {getNotEnrolledInternships().length === 0 ? (
              <div className="empty-state-modal">
                <p>🎉 Great job! You've enrolled in everything</p>
              </div>
            ) : (
              <div className="available-internships">
                {getNotEnrolledInternships().map(internship => (
                  <div key={internship.id} className="available-internship-card">
                    {internship.coverImage && (
                      <img 
                        src={`http://localhost:5000${internship.coverImage}`} 
                        alt={internship.title}
                        className="internship-cover-small"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <div className="internship-info">
                      <h3>{internship.title}</h3>
                      <p>{(internship.description || '').substring(0, 100)}...</p>
                      <div className="internship-meta">
                        <span>📅 {internship.durationDays || 30} days</span>
                        <span>📋 {internship.tasks?.length || 35} tasks</span>
                        <span>💰 ₹{internship.price || 'Free'}</span>
                      </div>
                      <button
                        className="btn-enroll-small"
                        onClick={() => handleEnroll(internship.id)}
                        disabled={loading}
                      >
                        {loading ? '⏳ Enrolling...' : '✅ Enroll Now'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unenroll Modal */}
      {showUnenrollModal && unenrollTarget && (
        <div className="modal-overlay" onClick={() => setShowUnenrollModal(false)}>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚠️ Unenroll from Internship?</h2>
              <button className="close-btn" onClick={() => setShowUnenrollModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p><strong>Internship:</strong> {unenrollTarget.internship?.title}</p>
              <p><strong>Your Progress:</strong> {unenrollTarget.progress}% complete</p>
              <p><strong>Tasks Completed:</strong> {unenrollTarget.completedTasks}/{unenrollTarget.totalTasks}</p>
              
              <p className="warning-text">⚠️ Unenrolling will permanently remove:</p>
              <ul>
                <li>❌ All your task submissions</li>
                <li>❌ Your progress and scores</li>
                <li>❌ All earned points ({unenrollTarget.currentPoints} points)</li>
                <li>❌ Access to internship materials</li>
              </ul>
              <p className="danger-text">🔴 This action cannot be undone. You will need to re-enroll and start from the beginning.</p>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowUnenrollModal(false)} disabled={loading}>
                Cancel
              </button>
              <button className="btn-danger" onClick={handleUnenroll} disabled={loading}>
                {loading ? '⏳ Unenrolling...' : '🗑️ Unenroll Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Task Modal */}
      {showSubmitModal && selectedTask && (
        <div className="modal-overlay" onClick={() => setShowSubmitModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📤 Submit Task #{selectedTask.taskNumber || 1}</h2>
              <button className="close-btn" onClick={() => setShowSubmitModal(false)}>×</button>
            </div>
            <h3>{selectedTask.title}</h3>

            {selectedTask.submissionType === 'GITHUB' && (
              <div className="form-group">
                <label>🔗 GitHub URL</label>
                <input
                  type="url"
                  value={submissionData.githubUrl}
                  onChange={(e) => setSubmissionData({...submissionData, githubUrl: e.target.value})}
                  placeholder="https://github.com/username/repo"
                  required
                />
              </div>
            )}

            {selectedTask.submissionType === 'FORM' && (
              <div className="form-group">
                <label>✍️ Your Answer</label>
                <textarea
                  rows={6}
                  value={submissionData.formData}
                  onChange={(e) => setSubmissionData({...submissionData, formData: e.target.value})}
                  placeholder="Enter your answer"
                  required
                />
              </div>
            )}

            {selectedTask.submissionType === 'FILE' && (
              <div className="form-group">
                <label>📁 Upload File</label>
                <input
                  type="file"
                  onChange={(e) => setSubmissionData({...submissionData, file: e.target.files[0]})}
                  required
                />
                {submissionData.file && (
                  <p className="file-selected">✅ {submissionData.file.name}</p>
                )}
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => {
                setShowSubmitModal(false);
                setSubmissionData({ githubUrl: '', formData: '', file: null });
              }}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSubmitTask} disabled={loading}>
                {loading ? '⏳ Submitting...' : '📤 Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && paymentDetails && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>💳 Certificate Payment</h2>
              <button className="close-btn" onClick={() => setShowPaymentModal(false)}>×</button>
            </div>
            <div className="payment-info">
              <div className="payment-amount">
                <p>Total Amount</p>
                <h3>₹{paymentDetails.amount || 499}</h3>
              </div>
              
              {paymentDetails.qrCodeUrl && (
                <div className="qr-section">
                  <h4>Scan QR Code to Pay</h4>
                  <img
                    src={`http://localhost:5000${paymentDetails.qrCodeUrl}`}
                    alt="Payment QR"
                    className="qr-code"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}

              <div className="form-group">
                <label>🔢 Transaction ID *</label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Enter transaction ID (MANDATORY)"
                  required
                  style={{ borderColor: !transactionId ? '#ff6b6b' : '' }}
                />
                <small style={{ color: '#666', fontSize: '12px' }}>* This field is mandatory for payment verification</small>
              </div>

              <div className="form-group">
                <label>📸 Payment Proof Screenshot *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPaymentProof(e.target.files[0])}
                  required
                />
                {paymentProof && (
                  <p className="file-selected">✅ {paymentProof.name}</p>
                )}
                <small style={{ color: '#666', fontSize: '12px' }}>* Upload screenshot of payment confirmation (MANDATORY)</small>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowPaymentModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={uploadPaymentProof} disabled={loading}>
                {loading ? '⏳ Uploading...' : '✅ Submit Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternDashboard;