// backend/src/controllers/certificate.controller.js - COMPLETE CERTIFICATE FLOW
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');
const prisma = new PrismaClient();

// ============================================================================
// ADMIN: Get pending certificate sessions (after payment approval)
// ============================================================================
const getPendingCertificateSessions = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      prisma.certificateSession.findMany({
        where: {
          status: 'PENDING_UPLOAD' // Sessions waiting for certificate upload
        },
        include: {
          user: { select: { id: true, userId: true, name: true, email: true } },
          enrollment: {
            include: { 
              internship: { select: { title: true } }
            }
          },
          payment: { select: { amount: true, verifiedAt: true } }
        },
        orderBy: { sessionStartedAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.certificateSession.count({
        where: { status: 'PENDING_UPLOAD' }
      })
    ]);

    res.json({
      success: true,
      data: {
        sessions,
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

// ============================================================================
// ADMIN: Upload certificate PDF for a session
// ============================================================================
const uploadCertificate = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const adminId = req.user.id;

    if (!req.files || !req.files.certificate) {
      return res.status(400).json({ success: false, message: 'Certificate PDF file is required' });
    }

    // Get certificate session
    const certSession = await prisma.certificateSession.findUnique({
      where: { id: sessionId },
      include: { 
        user: true,
        enrollment: {
          include: { internship: true }
        }
      }
    });

    if (!certSession) {
      return res.status(404).json({ success: false, message: 'Certificate session not found' });
    }

    if (certSession.status === 'ISSUED') {
      return res.status(400).json({ success: false, message: 'Certificate already issued for this session' });
    }

    // Upload certificate file
    const certificate = req.files.certificate;
    const uploadDir = path.join(__dirname, '../../uploads/certificates');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const fileName = `CERT-${certSession.certificateNumber}-${Date.now()}.pdf`;
    const filePath = `/uploads/certificates/${fileName}`;
    await certificate.mv(path.join(uploadDir, fileName));

    // Update certificate session to ISSUED
    const updated = await prisma.certificateSession.update({
      where: { id: sessionId },
      data: {
        status: 'ISSUED',
        uploadedAt: new Date(),
        uploadedBy: adminId,
        certificateUrl: filePath,
        issuedAt: new Date()
      }
    });

    // Update enrollment with certificate details
    await prisma.enrollment.update({
      where: { id: certSession.enrollmentId },
      data: {
        certificateIssued: true,
        certificateIssuedAt: new Date(),
        certificateUrl: filePath,
        certificateNumber: certSession.certificateNumber
      }
    });

    // Send notification to intern
    await prisma.notification.create({
      data: {
        userId: certSession.userId,
        title: '🎉 Certificate Ready!',
        message: `Your certificate for "${certSession.enrollment.internship.title}" is now ready to download from your dashboard!`,
        type: 'SUCCESS'
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'CERTIFICATE_UPLOADED',
        userId: adminId,
        details: `Certificate uploaded for ${certSession.user.name} - ${certSession.enrollment.internship.title}`,
        ipAddress: req.ip
      }
    });

    res.json({ 
      success: true, 
      data: updated, 
      message: 'Certificate uploaded and issued successfully' 
    });
  } catch (error) {
    console.error('Upload certificate error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// ADMIN: Get all issued certificates
// ============================================================================
const getIssuedCertificates = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      prisma.certificateSession.findMany({
        where: {
          status: 'ISSUED'
        },
        include: {
          user: { select: { id: true, userId: true, name: true, email: true } },
          enrollment: {
            include: { 
              internship: { select: { title: true } }
            }
          }
        },
        orderBy: { issuedAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.certificateSession.count({
        where: { status: 'ISSUED' }
      })
    ]);

    res.json({
      success: true,
      data: {
        sessions,
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

// ============================================================================
// INTERN: Get my certificates
// ============================================================================
const getMyCertificates = async (req, res) => {
  try {
    const userId = req.user.id;

    const certificates = await prisma.certificateSession.findMany({
      where: { 
        userId,
        status: 'ISSUED' // Only show issued certificates
      },
      include: {
        enrollment: {
          include: { 
            internship: { 
              select: { title: true, description: true } 
            }
          }
        }
      },
      orderBy: { issuedAt: 'desc' }
    });

    res.json({ 
      success: true, 
      data: certificates 
    });
  } catch (error) {
    console.error('Get my certificates error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// INTERN: Download certificate
// ============================================================================
const downloadCertificate = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const session = await prisma.certificateSession.findUnique({
      where: { id: sessionId },
      include: {
        user: true,
        enrollment: {
          include: { internship: true }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    // Verify ownership
    if (session.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    if (session.status !== 'ISSUED' || !session.certificateUrl) {
      return res.status(400).json({ success: false, message: 'Certificate not yet issued' });
    }

    const filePath = path.join(__dirname, '../..', session.certificateUrl);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Certificate file not found' });
    }

    // Send file for download
    res.download(filePath, `Certificate-${session.certificateNumber}.pdf`, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({ success: false, message: 'Error downloading certificate' });
      }
    });
  } catch (error) {
    console.error('Download certificate error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// INTERN: Get certificate status
// ============================================================================
const getMyCertificateStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all certificate sessions for this user
    const sessions = await prisma.certificateSession.findMany({
      where: { userId },
      include: {
        enrollment: {
          include: { internship: { select: { title: true } } }
        },
        payment: { select: { paymentStatus: true, verifiedAt: true } }
      },
      orderBy: { sessionStartedAt: 'desc' }
    });

    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// ADMIN: Get certificate session details
// ============================================================================
const getCertificateSessionDetails = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.certificateSession.findUnique({
      where: { id: sessionId },
      include: {
        user: { select: { userId: true, name: true, email: true, phone: true } },
        enrollment: {
          include: { 
            internship: true,
            submissions: {
              where: { status: 'APPROVED' },
              select: { score: true }
            }
          }
        },
        payment: true,
        uploader: { select: { name: true, email: true } }
      }
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPendingCertificateSessions,
  uploadCertificate,
  getIssuedCertificates,
  getMyCertificates,
  downloadCertificate,
  getMyCertificateStatus,
  getCertificateSessionDetails
};