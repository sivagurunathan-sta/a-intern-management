// backend/src/routes/payment.routes.js - FIXED TO MATCH CONTROLLER

const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly } = require('../middleware/auth.middleware');
const {
  initiateCertificatePayment,
  uploadPaymentProof,
  getAllPayments,
  getPaymentById,
  verifyPayment,
  rejectPayment,
  getInternPayments
} = require('../controllers/payment.controller');

// ============================================================================
// INTERN ROUTES
// ============================================================================

// Initiate certificate payment
router.post('/initiate-certificate', authMiddleware, initiateCertificatePayment);

// Upload payment proof (creates payment record)
router.post('/upload-proof', authMiddleware, uploadPaymentProof);

// Get intern's own payments
router.get('/my-payments', authMiddleware, getInternPayments);

// ============================================================================
// ADMIN ROUTES
// ============================================================================

// Get all payments (with filters)
router.get('/', authMiddleware, adminOnly, getAllPayments);

// Get payment by ID
router.get('/:paymentId', authMiddleware, getPaymentById);

// Verify payment
router.post('/:paymentId/verify', authMiddleware, adminOnly, verifyPayment);

// Reject payment
router.post('/:paymentId/reject', authMiddleware, adminOnly, rejectPayment);

module.exports = router;