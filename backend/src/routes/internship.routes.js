// backend/src/routes/internship.routes.js - UPDATED

const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly } = require('../middleware/auth.middleware');
const {
  getAllInternships,
  getInternshipById,
  createInternship,
  updateInternship,
  deleteInternship,
  enrollInternship,
  unenrollInternship,
  getInternEnrollments
} = require('../controllers/internship.controller');

// PUBLIC ROUTES - Anyone can view
router.get('/', getAllInternships);
router.get('/:id', getInternshipById);

// ADMIN ONLY ROUTES - Create, Update, Delete
router.post('/', authMiddleware, adminOnly, createInternship);
router.put('/:id', authMiddleware, adminOnly, updateInternship);
router.delete('/:id', authMiddleware, adminOnly, deleteInternship);

// INTERN ROUTES - Enrollment management
router.post('/:id/enroll', authMiddleware, enrollInternship);
router.delete('/:enrollmentId/unenroll', authMiddleware, unenrollInternship);

// INTERN ROUTES - Get their enrollments
router.get('/user/enrollments/list', authMiddleware, getInternEnrollments);

module.exports = router;