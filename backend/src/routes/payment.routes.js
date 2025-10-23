// backend/src/routes/payment.routes.js - FIXED WITH REJECT ROUTE
const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly } = require('../middleware/auth.middleware');
const {
  verifyPayment,
  rejectPayment,                       // ✅ ADDED - NEW REJECT
  initiateCertificatePayment,
  verifyPaymentAndIssueCertificate,
  initiatePaidTaskPayment,
  verifyPaidTaskPayment,
  getMyPayments,
  getAllPayments,
  getPaymentStats,
  getPendingPayments
} = require('../controllers/payment.controller');

// ============================================================================
// INTERN ROUTES
// ============================================================================

// Initiate certificate payment
router.post('/certificate/initiate', authMiddleware, initiateCertificatePayment);
router.post('/initiate-certificate', authMiddleware, initiateCertificatePayment);

// Submit payment proof
router.post('/certificate/verify', authMiddleware, verifyPaymentAndIssueCertificate);
router.post('/upload-proof', authMiddleware, verifyPaymentAndIssueCertificate);

// Initiate paid task payment
router.post('/paid-task/initiate', authMiddleware, initiatePaidTaskPayment);

// Verify paid task payment
router.post('/paid-task/verify', authMiddleware, verifyPaidTaskPayment);

// Get my payment history
router.get('/my-payments', authMiddleware, getMyPayments);

// ============================================================================
// ADMIN ROUTES
// ============================================================================

// Get all payments
router.get('/admin/all', authMiddleware, adminOnly, getAllPayments);
router.get('/', authMiddleware, adminOnly, getAllPayments);

// Get pending payments
router.get('/admin/pending', authMiddleware, adminOnly, getPendingPayments);

// Verify payment (admin approves)
router.post('/:paymentId/verify', authMiddleware, adminOnly, verifyPayment);
router.put('/:paymentId/verify', authMiddleware, adminOnly, verifyPayment);

// ✅ REJECT PAYMENT (admin rejects)
router.post('/:paymentId/reject', authMiddleware, adminOnly, rejectPayment);
router.put('/:paymentId/reject', authMiddleware, adminOnly, rejectPayment);

// Get payment statistics
router.get('/admin/stats', authMiddleware, adminOnly, getPaymentStats);

module.exports = router;