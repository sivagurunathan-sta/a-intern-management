// backend/src/routes/task.routes.js - UPDATED
const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly } = require('../middleware/auth.middleware');
const {
  createTask,
  getTasksForIntern,
  getTask,
  updateTask,
  deleteTask,
  getAllTasksForInternship
} = require('../controllers/task.controller');

// Admin only routes
router.post('/', authMiddleware, adminOnly, createTask);
router.put('/:taskId', authMiddleware, adminOnly, updateTask);
router.delete('/:taskId', authMiddleware, adminOnly, deleteTask);
router.get('/admin/internship/:internshipId', authMiddleware, adminOnly, getAllTasksForInternship);

// Intern routes
router.get('/internship/:internshipId', authMiddleware, getTasksForIntern);
router.get('/:taskId', authMiddleware, getTask);

module.exports = router;