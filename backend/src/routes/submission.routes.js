// backend/src/routes/submission.routes.js - FIXED

const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly } = require('../middleware/auth.middleware');
const {
  submitTask,
  getAllSubmissions,
  getSubmission,
  reviewSubmission,
  getInternSubmissions
} = require('../controllers/submission.controller');

// ============================================================================
// INTERN ROUTES
// ============================================================================

// Submit a task
router.post('/task/:taskId', authMiddleware, submitTask);

// Get intern's own submissions
router.get('/my-submissions', authMiddleware, getInternSubmissions);

// ============================================================================
// ADMIN ROUTES
// ============================================================================

// Get all submissions (with filters and pagination)
router.get('/', authMiddleware, adminOnly, getAllSubmissions);

// Get specific submission
router.get('/:submissionId', authMiddleware, adminOnly, getSubmission);

// Review submission (approve/reject)
router.put('/:submissionId/review', authMiddleware, adminOnly, reviewSubmission);

module.exports = router;