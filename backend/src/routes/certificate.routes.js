// backend/src/routes/certificate.routes.js
const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly } = require('../middleware/auth.middleware');
const {
  uploadCertificate,
  getPendingCertificates,
  getCertificateDetails,
  approveCertificate,
  rejectCertificate,
  internalUploadCertificateForValidation,
  getPendingValidations,
  approveValidation,
  rejectValidation,
  getMyCertificateStatus
} = require('../controllers/certificate.controller');

// Admin routes
router.post('/admin/upload/:paymentId', authMiddleware, adminOnly, uploadCertificate);
router.get('/admin/pending', authMiddleware, adminOnly, getPendingCertificates);
router.get('/admin/:certificateId', authMiddleware, adminOnly, getCertificateDetails);
router.post('/admin/:certificateId/approve', authMiddleware, adminOnly, approveCertificate);
router.post('/admin/:certificateId/reject', authMiddleware, adminOnly, rejectCertificate);

// Admin validation routes
router.get('/admin/validations/pending', authMiddleware, adminOnly, getPendingValidations);
router.post('/admin/validations/:validationId/approve', authMiddleware, adminOnly, approveValidation);
router.post('/admin/validations/:validationId/reject', authMiddleware, adminOnly, rejectValidation);

// Intern routes
router.post('/intern/upload-for-validation', authMiddleware, internalUploadCertificateForValidation);
router.get('/intern/my-status', authMiddleware, getMyCertificateStatus);

module.exports = router;