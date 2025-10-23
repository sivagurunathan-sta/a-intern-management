// backend/src/routes/payment.routes.js - FIXED WITH MISSING ROUTES ADDED
const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly } = require('../middleware/auth.middleware');
const {
  initiateCertificatePayment,
  verifyPaymentAndIssueCertificate,
  initiatePaidTaskPayment,
  verifyPaidTaskPayment,
  getMyPayments,
  getAllPayments,
  getPaymentStats,
  verifyPayment,        // ✅ ADDED - for admin to verify
  uploadPaymentProof    // ✅ ADDED - if you have this function
} = require('../controllers/payment.controller');

// ============================================================================
// INTERN ROUTES
// ============================================================================

// Initiate certificate payment - MULTIPLE ROUTE VARIATIONS
router.post('/certificate/initiate', authMiddleware, initiateCertificatePayment);
router.post('/initiate-certificate', authMiddleware, initiateCertificatePayment); // ✅ ADDED

// Submit payment proof - MULTIPLE ROUTE VARIATIONS
router.post('/certificate/verify', authMiddleware, verifyPaymentAndIssueCertificate);
router.post('/upload-proof', authMiddleware, verifyPaymentAndIssueCertificate); // ✅ ADDED - FIXES YOUR ERROR

// Initiate paid task payment
router.post('/paid-task/initiate', authMiddleware, initiatePaidTaskPayment);

// Verify paid task payment
router.post('/paid-task/verify', authMiddleware, verifyPaidTaskPayment);

// Get my payment history
router.get('/my-payments', authMiddleware, getMyPayments);

// ============================================================================
// ADMIN ROUTES
// ============================================================================

// Get all payments - MULTIPLE ROUTE VARIATIONS
router.get('/admin/all', authMiddleware, adminOnly, getAllPayments);
router.get('/', authMiddleware, adminOnly, getAllPayments); // ✅ ADDED - for ?status=PENDING

// Verify payment (admin approves/rejects)
router.post('/:paymentId/verify', authMiddleware, adminOnly, verifyPayment); // ✅ ADDED
router.put('/:paymentId/verify', authMiddleware, adminOnly, verifyPayment);  // ✅ ADDED

// Get payment statistics
router.get('/admin/stats', authMiddleware, adminOnly, getPaymentStats);

module.exports = router;