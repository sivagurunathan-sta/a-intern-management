// backend/src/routes/payment.routes.js - COMPLETE & WORKING
const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly, internOnly } = require('../middleware/auth.middleware');
const {
  initiateCertificatePayment,
  uploadPaymentProof,
  getAllPayments,
  verifyPayment,
  rejectPayment,
  getInternPayments,
  getPaymentById
} = require('../controllers/payment.controller');

// ============================================================================
// INTERN ROUTES - Payment
// ============================================================================

// Initiate certificate payment (intern requests payment)
router.post('/initiate-certificate', authMiddleware, internOnly, initiateCertificatePayment);

// Upload payment proof (intern submits proof)
router.post('/:paymentId/upload-proof', authMiddleware, internOnly, uploadPaymentProof);

// Get my payments
router.get('/my-payments', authMiddleware, internOnly, getInternPayments);

// Get specific payment details
router.get('/:paymentId', authMiddleware, getPaymentById);

// ============================================================================
// ADMIN ROUTES - Payment Verification
// ============================================================================

// Get all payments (with filtering)
router.get('/', authMiddleware, adminOnly, getAllPayments);

// Verify payment (admin confirms payment is real)
router.post('/:paymentId/verify', authMiddleware, adminOnly, verifyPayment);

// Reject payment (admin rejects payment with reason)
router.post('/:paymentId/reject', authMiddleware, adminOnly, rejectPayment);

module.exports = router;