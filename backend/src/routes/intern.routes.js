// backend/src/routes/intern.routes.js - FIXED

const express = require('express');
const router = express.Router();
const { authMiddleware, internOnly } = require('../middleware/auth.middleware');
const {
  getProfile,
  getEnrollments,
  getEnrollmentDetails,
  getInternshipTasks,
  getNotifications,
  markNotificationAsRead,
  getDashboardStats
} = require('../controllers/intern.controller');

// ============================================================================
// INTERN ROUTES - All require authentication
// ============================================================================

// Get intern profile
router.get('/profile', authMiddleware, getProfile);

// Get intern's enrollments
router.get('/enrollments', authMiddleware, getEnrollments);

// Get specific enrollment details
router.get('/enrollments/:enrollmentId', authMiddleware, getEnrollmentDetails);

// Get tasks for a specific internship
router.get('/internship/:internshipId/tasks', authMiddleware, getInternshipTasks);

// Get notifications
router.get('/notifications', authMiddleware, getNotifications);

// Mark notification as read
router.put('/notifications/:notificationId/read', authMiddleware, markNotificationAsRead);

// Get dashboard statistics
router.get('/dashboard/stats', authMiddleware, getDashboardStats);

module.exports = router;