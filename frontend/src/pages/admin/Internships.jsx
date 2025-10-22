// frontend/src/pages/admin/Internships.jsx - COMPLETE WITH EDIT & DELETE
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Internships.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Internships = () => {
  const [internships, setInternships] = useState([]);
  const [showInternshipModal, setShowInternshipModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedInternship, setSelectedInternship] = useState(null);
  const [editingInternship, setEditingInternship] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [internshipForm, setInternshipForm] = useState({
    title: '',
    description: '',
    durationDays: '35',
    certificatePrice: '499',
    passPercentage: '75',
    price: '0'
  });
  
  const [taskForm, setTaskForm] = useState({
    taskNumber: '1',
    title: '',
    description: '',
    videoUrl: '',
    points: '10',
    submissionType: 'GITHUB',
    isRequired: true,
    waitTimeHours: '12',
    maxAttempts: '3'
  });

  const [coverImage, setCoverImage] = useState(null);
  const [taskVideo, setTaskVideo] = useState(null);
  const [taskDocuments, setTaskDocuments] = useState([]);

  const getToken = () => localStorage.getItem('token') || localStorage.getItem('authToken');

  useEffect(() => {
    fetchInternships();
  }, []);

  const fetchInternships = async () => {
    try {
      const token = getToken();
      const res = await axios.get(`${API_URL}/internships`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setInternships(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching internships:', error);
    }
  };

  const fetchTasks = async (internshipId) => {
    try {
      const token = getToken();
      const res = await axios.get(`${API_URL}/tasks/admin/internship/${internshipId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setTasks(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  // ============ INTERNSHIP OPERATIONS ============

  const handleCreateInternship = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = getToken();
      const formData = new FormData();
      
      formData.append('title', internshipForm.title);
      formData.append('description', internshipForm.description);
      formData.append('durationDays', internshipForm.durationDays);
      formData.append('certificatePrice', internshipForm.certificatePrice);
      formData.append('passPercentage', internshipForm.passPercentage);
      formData.append('price', internshipForm.price);
      
      if (coverImage) {
        formData.append('coverImage', coverImage);
      }

      const res = await axios.post(`${API_URL}/internships`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.success) {
        alert('✅ Internship created successfully!');
        setShowInternshipModal(false);
        resetInternshipForm();
        fetchInternships();
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      alert('❌ Error: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleEditInternship = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = getToken();

      // If no new image, send as regular JSON
      if (!coverImage) {
        const res = await axios.put(`${API_URL}/internships/${editingInternship.id}`, {
          title: internshipForm.title,
          description: internshipForm.description,
          durationDays: internshipForm.durationDays,
          certificatePrice: internshipForm.certificatePrice,
          passPercentage: internshipForm.passPercentage,
          price: internshipForm.price
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (res.data.success) {
          alert('✅ Internship updated successfully!');
          setShowInternshipModal(false);
          setEditingInternship(null);
          resetInternshipForm();
          fetchInternships();
        }
      } else {
        // If new image, send FormData
        const formData = new FormData();
        formData.append('title', internshipForm.title);
        formData.append('description', internshipForm.description);
        formData.append('durationDays', internshipForm.durationDays);
        formData.append('certificatePrice', internshipForm.certificatePrice);
        formData.append('passPercentage', internshipForm.passPercentage);
        formData.append('price', internshipForm.price);
        formData.append('coverImage', coverImage);

        const res = await axios.put(`${API_URL}/internships/${editingInternship.id}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });

        if (res.data.success) {
          alert('✅ Internship updated successfully!');
          setShowInternshipModal(false);
          setEditingInternship(null);
          resetInternshipForm();
          fetchInternships();
        }
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      alert('❌ Error: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInternship = async (internshipId) => {
    if (!window.confirm('Are you sure you want to delete this internship? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const token = getToken();
      const res = await axios.delete(`${API_URL}/internships/${internshipId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        alert('✅ Internship deleted successfully!');
        fetchInternships();
        if (selectedInternship?.id === internshipId) {
          setSelectedInternship(null);
        }
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      alert('❌ Error: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ============ TASK OPERATIONS ============

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = getToken();
      const formData = new FormData();
      
      formData.append('internshipId', selectedInternship.id);
      formData.append('taskNumber', taskForm.taskNumber);
      formData.append('title', taskForm.title);
      formData.append('description', taskForm.description);
      formData.append('videoUrl', taskForm.videoUrl);
      formData.append('points', taskForm.points);
      formData.append('submissionType', taskForm.submissionType);
      formData.append('isRequired', taskForm.isRequired);
      formData.append('waitTimeHours', taskForm.waitTimeHours);
      formData.append('maxAttempts', taskForm.maxAttempts);
      
      if (taskVideo) {
        formData.append('video', taskVideo);
      }
      
      if (taskDocuments.length > 0) {
        taskDocuments.forEach((doc, index) => {
          formData.append(`document${index}`, doc);
        });
      }

      const res = await axios.post(`${API_URL}/tasks`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.success) {
        alert('✅ Task created successfully!');
        setShowTaskModal(false);
        resetTaskForm();
        fetchTasks(selectedInternship.id);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      alert('❌ Error: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTask = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = getToken();
      const formData = new FormData();
      
      formData.append('taskNumber', taskForm.taskNumber);
      formData.append('title', taskForm.title);
      formData.append('description', taskForm.description);
      formData.append('videoUrl', taskForm.videoUrl);
      formData.append('points', taskForm.points);
      formData.append('submissionType', taskForm.submissionType);
      formData.append('isRequired', taskForm.isRequired);
      formData.append('waitTimeHours', taskForm.waitTimeHours);
      formData.append('maxAttempts', taskForm.maxAttempts);
      
      if (taskVideo) {
        formData.append('video', taskVideo);
      }
      
      if (taskDocuments.length > 0) {
        taskDocuments.forEach((doc, index) => {
          formData.append(`document${index}`, doc);
        });
      }

      const res = await axios.put(`${API_URL}/tasks/${editingTask.id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.success) {
        alert('✅ Task updated successfully!');
        setShowTaskModal(false);
        setEditingTask(null);
        resetTaskForm();
        fetchTasks(selectedInternship.id);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      alert('❌ Error: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const token = getToken();
      const res = await axios.delete(`${API_URL}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        alert('✅ Task deleted successfully!');
        fetchTasks(selectedInternship.id);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      alert('❌ Error: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ============ HELPER FUNCTIONS ============

  const resetInternshipForm = () => {
    setInternshipForm({
      title: '',
      description: '',
      durationDays: '35',
      certificatePrice: '499',
      passPercentage: '75',
      price: '0'
    });
    setCoverImage(null);
    setEditingInternship(null);
  };

  const resetTaskForm = () => {
    setTaskForm({
      taskNumber: String(tasks.length + 1),
      title: '',
      description: '',
      videoUrl: '',
      points: '10',
      submissionType: 'GITHUB',
      isRequired: true,
      waitTimeHours: '12',
      maxAttempts: '3'
    });
    setTaskVideo(null);
    setTaskDocuments([]);
    setEditingTask(null);
  };

  const openInternshipModal = (internship = null) => {
    if (internship) {
      setEditingInternship(internship);
      setInternshipForm({
        title: internship.title,
        description: internship.description,
        durationDays: String(internship.durationDays),
        certificatePrice: String(internship.certificatePrice),
        passPercentage: String(internship.passPercentage),
        price: String(internship.price)
      });
    } else {
      resetInternshipForm();
    }
    setShowInternshipModal(true);
  };

  const openTaskModal = (task = null) => {
    if (task) {
      setEditingTask(task);
      setTaskForm({
        taskNumber: String(task.taskNumber),
        title: task.title,
        description: task.description,
        videoUrl: task.videoUrl || '',
        points: String(task.points),
        submissionType: task.submissionType,
        isRequired: task.isRequired,
        waitTimeHours: String(task.waitTimeHours),
        maxAttempts: String(task.maxAttempts)
      });
    } else {
      resetTaskForm();
    }
    setShowTaskModal(true);
  };

  const openTaskManager = (internship) => {
    setSelectedInternship(internship);
    fetchTasks(internship.id);
  };

  return (
    <div className="internships-container">
      <div className="page-header">
        <h1>📚 Internships Management</h1>
        <button className="btn-primary" onClick={() => openInternshipModal()}>
          ➕ Create Internship
        </button>
      </div>

      <div className="internships-grid">
        {internships.map(internship => (
          <div key={internship.id} className="internship-card">
            {internship.coverImage && (
              <img 
                src={`http://localhost:5000${internship.coverImage}`} 
                alt={internship.title}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            <div className="card-content">
              <h3>{internship.title}</h3>
              <p>{internship.description.substring(0, 100)}...</p>
              <div className="card-stats">
                <span>📅 {internship.durationDays} days</span>
                <span>💰 ₹{internship.certificatePrice}</span>
                <span>📊 {internship._count?.enrollments || 0} enrolled</span>
                <span>📝 {internship.tasks?.length || 0} tasks</span>
              </div>
              
              <div className="card-actions">
                <button 
                  className="btn-view"
                  onClick={() => openTaskManager(internship)}
                >
                  Manage Tasks
                </button>
                <button 
                  className="btn-edit"
                  onClick={() => openInternshipModal(internship)}
                >
                  ✏️ Edit
                </button>
                <button 
                  className="btn-delete"
                  onClick={() => handleDeleteInternship(internship.id)}
                  disabled={loading}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Internship Modal */}
      {showInternshipModal && (
        <div className="modal-overlay" onClick={() => setShowInternshipModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingInternship ? '✏️ Edit Internship' : '✨ Create New Internship'}</h2>
            <form onSubmit={editingInternship ? handleEditInternship : handleCreateInternship}>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={internshipForm.title}
                  onChange={(e) => setInternshipForm({...internshipForm, title: e.target.value})}
                  placeholder="e.g., Full Stack Web Development"
                />
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={internshipForm.description}
                  onChange={(e) => setInternshipForm({...internshipForm, description: e.target.value})}
                  rows={4}
                  placeholder="Detailed description of the internship..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Duration (Days)</label>
                  <input
                    type="number"
                    value={internshipForm.durationDays}
                    onChange={(e) => setInternshipForm({...internshipForm, durationDays: e.target.value})}
                    min="1"
                  />
                </div>

                <div className="form-group">
                  <label>Certificate Price (₹)</label>
                  <input
                    type="number"
                    value={internshipForm.certificatePrice}
                    onChange={(e) => setInternshipForm({...internshipForm, certificatePrice: e.target.value})}
                    min="0"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Pass Percentage (%)</label>
                  <input
                    type="number"
                    value={internshipForm.passPercentage}
                    onChange={(e) => setInternshipForm({...internshipForm, passPercentage: e.target.value})}
                    min="0"
                    max="100"
                  />
                </div>

                <div className="form-group">
                  <label>Enrollment Price (₹)</label>
                  <input
                    type="number"
                    value={internshipForm.price}
                    onChange={(e) => setInternshipForm({...internshipForm, price: e.target.value})}
                    min="0"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Cover Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverImage(e.target.files[0])}
                />
                {coverImage && <p className="file-selected">✅ {coverImage.name}</p>}
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => {
                  setShowInternshipModal(false);
                  resetInternshipForm();
                }} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? '⏳ Saving...' : editingInternship ? '✅ Update Internship' : '✅ Create Internship'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Manager Modal */}
      {selectedInternship && !showTaskModal && (
        <div className="modal-overlay" onClick={() => setSelectedInternship(null)}>
          <div className="modal-content task-manager-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <div>
                <h2>📋 Tasks: {selectedInternship.title}</h2>
                <p className="task-count">{tasks.length} tasks created</p>
              </div>
              <button className="btn-primary" onClick={() => openTaskModal()}>
                ➕ Add Task
              </button>
            </div>

            <div className="tasks-list-container">
              {tasks.length === 0 ? (
                <div className="empty-state">
                  <p>📝 No tasks yet. Click "Add Task" to create the first task.</p>
                </div>
              ) : (
                <div className="tasks-list">
                  {tasks.map(task => (
                    <div key={task.id} className="task-item-card">
                      <div className="task-item-header">
                        <h4>Task #{task.taskNumber}: {task.title}</h4>
                        <div className="task-badges">
                          <span className={task.isRequired ? 'badge-required' : 'badge-optional'}>
                            {task.isRequired ? '⭐ Required' : '📝 Optional'}
                          </span>
                          <span className="badge-points">
                            {task.points} points
                          </span>
                        </div>
                      </div>
                      <p className="task-description">
                        {task.description.substring(0, 150)}...
                      </p>
                      <div className="task-item-footer">
                        <span>📊 {task.submissionType}</span>
                        {task.videoUrl && <span>🎥 Video</span>}
                        {task.files && task.files.length > 0 && <span>📄 {task.files.length} docs</span>}
                        <span>👥 {task._count?.submissions || 0} submissions</span>
                      </div>
                      <div className="task-actions">
                        <button 
                          className="btn-edit-small"
                          onClick={() => openTaskModal(task)}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          className="btn-delete-small"
                          onClick={() => handleDeleteTask(task.id)}
                          disabled={loading}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setSelectedInternship(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Task Modal */}
      {showTaskModal && selectedInternship && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal-content task-create-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingTask ? '✏️ Edit Task' : '➕ Create Task'} for: {selectedInternship.title}</h2>
            <form onSubmit={editingTask ? handleEditTask : handleCreateTask}>
              <div className="form-row">
                <div className="form-group">
                  <label>Task Number *</label>
                  <input
                    type="number"
                    value={taskForm.taskNumber}
                    onChange={(e) => setTaskForm({...taskForm, taskNumber: e.target.value})}
                    min="1"
                  />
                </div>

                <div className="form-group">
                  <label>Points *</label>
                  <input
                    type="number"
                    value={taskForm.points}
                    onChange={(e) => setTaskForm({...taskForm, points: e.target.value})}
                    min="1"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Task Title *</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                  placeholder="e.g., Build a Landing Page"
                />
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                  rows={5}
                  placeholder="Detailed instructions for the task..."
                />
              </div>

              <div className="form-group">
                <label>Video URL (YouTube or external link)</label>
                <input
                  type="url"
                  value={taskForm.videoUrl}
                  onChange={(e) => setTaskForm({...taskForm, videoUrl: e.target.value})}
                  placeholder="https://youtube.com/watch?v=..."
                />
                <p className="form-hint">Or upload a video file below</p>
              </div>

              <div className="form-group">
                <label>Upload Video File (Optional)</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setTaskVideo(e.target.files[0])}
                />
                {taskVideo && <p className="file-selected">✅ {taskVideo.name}</p>}
              </div>

              <div className="form-group">
                <label>Upload Reference Documents (PDF, DOCX, etc.)</label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.ppt,.pptx"
                  onChange={(e) => setTaskDocuments(Array.from(e.target.files))}
                />
                {taskDocuments.length > 0 && (
                  <div className="files-list">
                    {taskDocuments.map((doc, i) => (
                      <p key={i} className="file-selected">✅ {doc.name}</p>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Submission Type *</label>
                  <select
                    value={taskForm.submissionType}
                    onChange={(e) => setTaskForm({...taskForm, submissionType: e.target.value})}
                  >
                    <option value="GITHUB">GitHub Repository</option>
                    <option value="FILE">File Upload</option>
                    <option value="FORM">Text/Form Response</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Wait Time (Hours)</label>
                  <input
                    type="number"
                    value={taskForm.waitTimeHours}
                    onChange={(e) => setTaskForm({...taskForm, waitTimeHours: e.target.value})}
                    min="0"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Max Attempts</label>
                  <input
                    type="number"
                    value={taskForm.maxAttempts}
                    onChange={(e) => setTaskForm({...taskForm, maxAttempts: e.target.value})}
                    min="1"
                  />
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={taskForm.isRequired}
                      onChange={(e) => setTaskForm({...taskForm, isRequired: e.target.checked})}
                    />
                    Required Task
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => {
                  setShowTaskModal(false);
                  resetTaskForm();
                }} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? '⏳ Saving...' : editingTask ? '✅ Update Task' : '✅ Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Internships;