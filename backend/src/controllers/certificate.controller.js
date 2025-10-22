// backend/src/controllers/certificate.controller.js
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');
const prisma = new PrismaClient();

// Upload certificate (Admin uploads after payment verification)
const uploadCertificate = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const adminId = req.user.id;

    if (!req.files || !req.files.certificate) {
      return res.status(400).json({ success: false, message: 'Certificate file is required' });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true }
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (payment.paymentStatus !== 'VERIFIED') {
      return res.status(400).json({ success: false, message: 'Payment must be verified first' });
    }

    // Get enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: payment.userId,
        internshipId: payment.internshipId
      }
    });

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    // Upload certificate file
    const certificate = req.files.certificate;
    const uploadDir = path.join(__dirname, '../../uploads/certificates');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const fileName = `CERT-${enrollment.id}-${Date.now()}.pdf`;
    const filePath = `/uploads/certificates/${fileName}`;
    await certificate.mv(path.join(uploadDir, fileName));

    // Create or update certificate session
    let certSession = await prisma.certificateSession.findFirst({
      where: { paymentId }
    });

    if (!certSession) {
      const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      certSession = await prisma.certificateSession.create({
        data: {
          enrollmentId: enrollment.id,
          userId: payment.userId,
          paymentId,
          certificateNumber,
          status: 'UPLOADED',
          uploadedAt: new Date(),
          uploadedBy: adminId,
          certificateUrl: filePath
        }
      });
    } else {
      certSession = await prisma.certificateSession.update({
        where: { id: certSession.id },
        data: {
          status: 'UPLOADED',
          uploadedAt: new Date(),
          uploadedBy: adminId,
          certificateUrl: filePath
        }
      });
    }

    // Update enrollment
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        certificateIssued: true,
        certificateIssuedAt: new Date(),
        certificateUrl: filePath,
        certificateNumber: certSession.certificateNumber
      }
    });

    // Send notification to user
    await prisma.notification.create({
      data: {
        userId: payment.userId,
        title: 'Certificate Uploaded',
        message: 'Your certificate has been uploaded. It will be available in 24 hours.',
        type: 'INFO'
      }
    });

    res.json({ success: true, data: certSession });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all pending certificates (Admin)
const getPendingCertificates = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [certificates, total] = await Promise.all([
      prisma.certificateSession.findMany({
        where: {
          status: { in: ['UPLOADED', 'PENDING_VALIDATION'] }
        },
        include: {
          user: { select: { id: true, userId: true, name: true, email: true } },
          enrollment: {
            include: { internship: { select: { title: true } } }
          }
        },
        orderBy: { uploadedAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.certificateSession.count({
        where: { status: { in: ['UPLOADED', 'PENDING_VALIDATION'] } }
      })
    ]);

    res.json({
      success: true,
      data: {
        certificates,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get certificate details
const getCertificateDetails = async (req, res) => {
  try {
    const { certificateId } = req.params;

    const certificate = await prisma.certificateSession.findUnique({
      where: { id: certificateId },
      include: {
        user: { select: { userId: true, name: true, email: true } },
        enrollment: {
          include: { internship: { select: { title: true } } }
        },
        uploader: { select: { name: true } }
      }
    });

    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    res.json({ success: true, data: certificate });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Approve certificate
const approveCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;
    const adminId = req.user.id;

    const certificate = await prisma.certificateSession.findUnique({
      where: { id: certificateId },
      include: { user: true }
    });

    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    // Update certificate status
    const updated = await prisma.certificateSession.update({
      where: { id: certificateId },
      data: {
        status: 'ISSUED',
        issuedAt: new Date()
      }
    });

    // Send notification
    await prisma.notification.create({
      data: {
        userId: certificate.userId,
        title: 'Certificate Approved',
        message: 'Your certificate has been approved and is ready to download!',
        type: 'SUCCESS'
      }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reject certificate with message
const rejectCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;
    const { rejectionMessage } = req.body;
    const adminId = req.user.id;

    if (!rejectionMessage) {
      return res.status(400).json({ success: false, message: 'Rejection message is required' });
    }

    const certificate = await prisma.certificateSession.findUnique({
      where: { id: certificateId },
      include: { user: true }
    });

    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    // Update certificate status
    const updated = await prisma.certificateSession.update({
      where: { id: certificateId },
      data: {
        status: 'REJECTED'
      }
    });

    // Send notification with rejection reason
    await prisma.notification.create({
      data: {
        userId: certificate.userId,
        title: 'Certificate Rejected',
        message: `Your certificate was rejected. Reason: ${rejectionMessage}. Please resubmit with corrections.`,
        type: 'WARNING'
      }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Intern uploads certificate for validation
const internalUploadCertificateForValidation = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.files || !req.files.certificate) {
      return res.status(400).json({ success: false, message: 'Certificate file is required' });
    }

    // Check if user has an eligible enrollment for certificate
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId,
        isCompleted: true,
        certificatePurchased: true
      }
    });

    if (!enrollment) {
      return res.status(400).json({ success: false, message: 'No eligible enrollment found' });
    }

    // Upload certificate file
    const certificate = req.files.certificate;
    const uploadDir = path.join(__dirname, '../../uploads/certificates/validation');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const fileName = `VALIDATION-${enrollment.id}-${Date.now()}.pdf`;
    const filePath = `/uploads/certificates/validation/${fileName}`;
    await certificate.mv(path.join(uploadDir, fileName));

    // Create certificate validation record
    const validation = await prisma.certificateValidation.create({
      data: {
        userId,
        certificateNumber: enrollment.certificateNumber,
        certificateUrl: filePath,
        status: 'PENDING'
      }
    });

    // Send notification to admin
    await prisma.notification.create({
      data: {
        userId: userId,
        title: 'Certificate Awaiting Verification',
        message: 'Your certificate has been submitted for verification. Admin will review it within 24 hours.',
        type: 'INFO'
      }
    });

    res.json({ success: true, data: validation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get pending certificate validations (Admin)
const getPendingValidations = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [validations, total] = await Promise.all([
      prisma.certificateValidation.findMany({
        where: { status: 'PENDING' },
        include: {
          user: { select: { userId: true, name: true, email: true } }
        },
        orderBy: { submittedAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.certificateValidation.count({ where: { status: 'PENDING' } })
    ]);

    res.json({
      success: true,
      data: {
        validations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Approve certificate validation
const approveValidation = async (req, res) => {
  try {
    const { validationId } = req.params;
    const adminId = req.user.id;

    const validation = await prisma.certificateValidation.findUnique({
      where: { id: validationId },
      include: { user: true }
    });

    if (!validation) {
      return res.status(404).json({ success: false, message: 'Validation not found' });
    }

    // Update validation
    const updated = await prisma.certificateValidation.update({
      where: { id: validationId },
      data: {
        status: 'VALID',
        isValid: true,
        reviewedAt: new Date(),
        reviewedBy: adminId
      }
    });

    // Send notification
    await prisma.notification.create({
      data: {
        userId: validation.userId,
        title: 'Certificate Verified',
        message: 'Your certificate has been verified and is now valid!',
        type: 'SUCCESS'
      }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reject certificate validation with message
const rejectValidation = async (req, res) => {
  try {
    const { validationId } = req.params;
    const { reviewMessage } = req.body;
    const adminId = req.user.id;

    if (!reviewMessage) {
      return res.status(400).json({ success: false, message: 'Review message is required' });
    }

    const validation = await prisma.certificateValidation.findUnique({
      where: { id: validationId },
      include: { user: true }
    });

    if (!validation) {
      return res.status(404).json({ success: false, message: 'Validation not found' });
    }

    // Update validation
    const updated = await prisma.certificateValidation.update({
      where: { id: validationId },
      data: {
        status: 'INVALID',
        isValid: false,
        reviewMessage,
        reviewedAt: new Date(),
        reviewedBy: adminId
      }
    });

    // Send notification with message
    await prisma.notification.create({
      data: {
        userId: validation.userId,
        title: 'Certificate Needs Correction',
        message: `Admin feedback: ${reviewMessage}. Please resubmit the corrected certificate.`,
        type: 'WARNING'
      }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get my certificate status (Intern)
const getMyCertificateStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const session = await prisma.certificateSession.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        enrollment: { include: { internship: true } }
      }
    });

    const validation = await prisma.certificateValidation.findFirst({
      where: { userId },
      orderBy: { submittedAt: 'desc' }
    });

    res.json({
      success: true,
      data: {
        session,
        validation
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
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
};