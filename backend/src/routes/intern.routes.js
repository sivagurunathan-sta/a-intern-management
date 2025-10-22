// backend/src/routes/intern.routes.js - UPDATED

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const {
  getProfile,
  getEnrollments,
  getEnrollmentDetails,
  getInternshipTasks,
  getNotifications,
  markNotificationAsRead,
  getDashboardStats
} = require('../controllers/intern.controller');

// Profile routes
router.get('/profile', authMiddleware, getProfile);
router.get('/dashboard/stats', authMiddleware, getDashboardStats);

// Enrollment routes
router.get('/enrollments', authMiddleware, getEnrollments);
router.get('/enrollments/:enrollmentId', authMiddleware, getEnrollmentDetails);
router.get('/internship/:internshipId/tasks', authMiddleware, getInternshipTasks);

// Notification routes
router.get('/notifications', authMiddleware, getNotifications);
router.put('/notifications/:notificationId/read', authMiddleware, markNotificationAsRead);

module.exports = router;