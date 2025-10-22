// backend/src/controllers/payment.controller.js - COMPLETE & WORKING
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');
const prisma = new PrismaClient();

// ============================================================================
// CERTIFICATE PAYMENT - INITIATE
// ============================================================================
const initiateCertificatePayment = async (req, res) => {
  try {
    const { enrollmentId } = req.body;
    const userId = req.user.id;

    // Get enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { internship: true, user: true }
    });

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    if (enrollment.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!enrollment.isCompleted) {
      return res.status(400).json({ 
        success: false, 
        message: 'Complete all 35 tasks first to purchase certificate' 
      });
    }

    // Check score
    const score = enrollment.finalScore || 0;
    const totalPoints = 35 * 10; // 35 tasks * 10 points each
    const percentage = (score / totalPoints) * 100;

    if (percentage < enrollment.internship.passPercentage) {
      return res.status(400).json({ 
        success: false, 
        message: `You scored ${Math.round(percentage)}%. Need ${enrollment.internship.passPercentage}% to purchase certificate` 
      });
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId,
        internshipId: enrollment.internshipId,
        amount: enrollment.internship.certificatePrice,
        paymentType: 'CERTIFICATE',
        paymentStatus: 'PENDING'
      }
    });

    return res.json({ 
      success: true, 
      data: { 
        payment,
        internshipTitle: enrollment.internship.title,
        amount: enrollment.internship.certificatePrice,
        userScore: Math.round(percentage)
      } 
    });
  } catch (error) {
    console.error('Payment initiation error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// UPLOAD PAYMENT PROOF
// ============================================================================
const uploadPaymentProof = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { transactionId } = req.body;
    const userId = req.user.id;

    console.log('Uploading payment proof:', { paymentId, transactionId });

    // Validate transaction ID
    if (!transactionId || transactionId.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Transaction ID is required' 
      });
    }

    // Check file
    if (!req.files || !req.files.paymentProof) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment proof image is required' 
      });
    }

    // Get payment
    const payment = await prisma.payment.findUnique({ 
      where: { id: paymentId },
      include: { user: true }
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (payment.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Save file
    const file = req.files.paymentProof;
    const uploadDir = path.join(__dirname, '../../uploads/payments');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `/uploads/payments/${fileName}`;
    
    await file.mv(path.join(uploadDir, fileName));

    // Update payment
    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        paymentProofUrl: filePath,
        transactionId: transactionId.trim(),
        paymentStatus: 'PENDING'
      },
      include: { user: true }
    });

    // Create notification for intern
    await prisma.notification.create({
      data: {
        userId,
        title: '📤 Payment Submitted for Review',
        message: `Your payment proof for ₹${payment.amount} has been submitted. Admin will verify and confirm within 24 hours.`,
        type: 'INFO'
      }
    });

    return res.json({ 
      success: true, 
      data: updated,
      message: 'Payment proof uploaded successfully! Waiting for admin verification.'
    });
  } catch (error) {
    console.error('Upload payment proof error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// ADMIN - GET ALL PAYMENTS
// ============================================================================
const getAllPayments = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (status) where.paymentStatus = status;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          user: { select: { userId: true, name: true, email: true } },
          internship: { select: { title: true } }
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.payment.count({ where })
    ]);

    return res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// ADMIN - VERIFY PAYMENT
// ============================================================================
const verifyPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { verifiedTransactionId } = req.body;

    console.log('Verifying payment:', { paymentId, verifiedTransactionId });

    if (!verifiedTransactionId || verifiedTransactionId.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Verified transaction ID is required' 
      });
    }

    // Get payment
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true, internship: true }
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // Update payment
    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        paymentStatus: 'VERIFIED',
        verifiedTransactionId: verifiedTransactionId.trim(),
        verifiedAt: new Date()
      }
    });

    // Certificate payment specific: Create certificate session
    if (payment.paymentType === 'CERTIFICATE' && payment.internshipId) {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          userId: payment.userId,
          internshipId: payment.internshipId
        }
      });

      if (enrollment) {
        const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            certificatePurchased: true,
            certificateNumber,
            certificateIssued: true,
            certificateIssuedAt: new Date()
          }
        });

        await prisma.certificateSession.create({
          data: {
            enrollmentId: enrollment.id,
            userId: payment.userId,
            paymentId,
            certificateNumber,
            status: 'ISSUED',
            issuedAt: new Date()
          }
        });
      }
    }

    // Send success notification to intern
    await prisma.notification.create({
      data: {
        userId: payment.userId,
        title: '✅ Payment Verified Successfully!',
        message: `Your payment of ₹${payment.amount} has been verified. Your certificate has been issued! Download it from your dashboard.`,
        type: 'SUCCESS'
      }
    });

    return res.json({ 
      success: true, 
      data: updated,
      message: 'Payment verified and certificate issued successfully!'
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// ADMIN - REJECT PAYMENT
// ============================================================================
const rejectPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { rejectionReason } = req.body;

    console.log('Rejecting payment:', { paymentId, rejectionReason });

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Rejection reason is required' 
      });
    }

    // Get payment
    const payment = await prisma.payment.findUnique({ 
      where: { id: paymentId },
      include: { user: true }
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // Update payment
    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        paymentStatus: 'REJECTED',
        rejectionReason: rejectionReason.trim()
      }
    });

    // Send rejection notification to intern
    await prisma.notification.create({
      data: {
        userId: payment.userId,
        title: '❌ Payment Rejected',
        message: `Your payment of ₹${payment.amount} was rejected.\n\nReason: ${rejectionReason}\n\nPlease review and try again.`,
        type: 'ERROR'
      }
    });

    return res.json({ 
      success: true, 
      data: updated,
      message: 'Payment rejected successfully!'
    });
  } catch (error) {
    console.error('Reject payment error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// INTERN - GET MY PAYMENTS
// ============================================================================
const getInternPayments = async (req, res) => {
  try {
    const userId = req.user.id;

    const payments = await prisma.payment.findMany({
      where: { userId },
      include: {
        internship: { select: { title: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: payments });
  } catch (error) {
    console.error('Get intern payments error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// INTERN - GET PAYMENT BY ID
// ============================================================================
const getPaymentById = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: { select: { name: true, email: true } },
        internship: { select: { title: true, certificatePrice: true } }
      }
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (payment.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    return res.json({ success: true, data: payment });
  } catch (error) {
    console.error('Get payment error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  initiateCertificatePayment,
  uploadPaymentProof,
  getAllPayments,
  verifyPayment,
  rejectPayment,
  getInternPayments,
  getPaymentById
};