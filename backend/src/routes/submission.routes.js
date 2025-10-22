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

router.post('/task/:taskId', authMiddleware, submitTask);
router.get('/', authMiddleware, adminOnly, getAllSubmissions);
router.get('/my-submissions', authMiddleware, getInternSubmissions);
router.get('/:submissionId', authMiddleware, getSubmission);
router.put('/:submissionId/review', authMiddleware, adminOnly, reviewSubmission);

module.exports = router;