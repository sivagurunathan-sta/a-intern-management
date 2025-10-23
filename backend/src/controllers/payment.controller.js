// backend/src/controllers/payment.controller.js - COMPLETE FIX
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

    console.log('💳 Initiating payment:', { enrollmentId, userId });

    // Get enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { 
        internship: { 
          include: { tasks: true } 
        }, 
        user: true,
        submissions: {
          where: { status: 'APPROVED' }
        }
      }
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
        message: 'Complete all tasks first to purchase certificate' 
      });
    }

    // ✅ FIXED: Calculate score based on actual tasks
    const totalTasks = enrollment.internship.tasks.length;
    const maxPossibleScore = totalTasks * 10;
    const actualScore = enrollment.submissions.reduce((sum, sub) => sum + (sub.score || 0), 0);
    const percentage = maxPossibleScore > 0 ? (actualScore / maxPossibleScore) * 100 : 0;
    const passPercentage = enrollment.internship.passPercentage || 75;

    console.log('📊 Score check:', { totalTasks, maxPossibleScore, actualScore, percentage: percentage.toFixed(2), passPercentage });

    if (percentage < passPercentage) {
      return res.status(400).json({ 
        success: false, 
        message: `You scored ${percentage.toFixed(1)}%. Need ${passPercentage}% to purchase certificate` 
      });
    }

    // ✅ Check for existing VERIFIED payment
    const existingVerifiedPayment = await prisma.payment.findFirst({
      where: {
        userId,
        internshipId: enrollment.internshipId,
        paymentType: 'CERTIFICATE',
        paymentStatus: 'VERIFIED'
      }
    });

    if (existingVerifiedPayment) {
      return res.status(400).json({ 
        success: false, 
        message: 'Certificate already purchased and verified' 
      });
    }

    // ✅ Check for existing PENDING payment WITH proof (already submitted)
    const existingPendingWithProof = await prisma.payment.findFirst({
      where: {
        userId,
        internshipId: enrollment.internshipId,
        paymentType: 'CERTIFICATE',
        paymentStatus: 'PENDING',
        paymentProofUrl: { not: null }
      }
    });

    if (existingPendingWithProof) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment already submitted and pending verification. Please wait for admin approval.'
      });
    }

    // ✅ FIXED: Don't create payment yet, just return data for modal
    console.log('✅ Certificate eligible - returning data for modal');

    return res.json({ 
      success: true, 
      data: { 
        enrollmentId: enrollment.id,
        internshipId: enrollment.internshipId,
        internshipTitle: enrollment.internship.title,
        amount: enrollment.internship.certificatePrice || 499,
        qrCodeUrl: '/uploads/qr/payment-qr.png',
        userScore: percentage.toFixed(1)
      },
      message: 'Certificate purchase eligible. Please complete payment.'
    });
  } catch (error) {
    console.error('❌ Payment initiation error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// UPLOAD PAYMENT PROOF - CREATES PAYMENT RECORD
// ============================================================================
const uploadPaymentProof = async (req, res) => {
  try {
    const { enrollmentId, internshipId, amount } = req.body;
    const { transactionId } = req.body;
    const userId = req.user.id;

    console.log('📤 Uploading payment proof:', { enrollmentId, internshipId, transactionId, hasFile: !!req.files });

    // ✅ MANDATORY: Validate transaction ID
    if (!transactionId || transactionId.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Transaction ID is mandatory' 
      });
    }

    // ✅ MANDATORY: Check file
    if (!req.files || !req.files.paymentProof) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment proof image is mandatory' 
      });
    }

    // ✅ Check for existing payment with proof already submitted
    const existingPayment = await prisma.payment.findFirst({
      where: {
        userId,
        internshipId,
        paymentType: 'CERTIFICATE',
        paymentStatus: { in: ['PENDING', 'VERIFIED'] },
        paymentProofUrl: { not: null }
      }
    });

    if (existingPayment) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment already submitted. Please wait for admin verification.' 
      });
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

    console.log('✅ File saved:', filePath);

    // ✅ NOW CREATE the payment record with proof
    const payment = await prisma.payment.create({
      data: {
        userId,
        internshipId,
        amount: parseInt(amount),
        paymentType: 'CERTIFICATE',
        paymentStatus: 'PENDING',
        paymentProofUrl: filePath,
        transactionId: transactionId.trim(),
        qrCodeUrl: '/uploads/qr/payment-qr.png'
      },
      include: { user: true }
    });

    console.log('✅ Payment created with proof:', payment.id);

    // Update enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId,
        internshipId
      }
    });

    if (enrollment) {
      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { certificatePurchased: true }
      });
      console.log('✅ Enrollment updated - certificate marked as purchased');
    }

    // Create notification for intern
    await prisma.notification.create({
      data: {
        userId,
        title: '📤 Payment Submitted for Review',
        message: `Your payment proof for ₹${amount} has been submitted. Admin will verify within 24 hours.`,
        type: 'INFO'
      }
    });

    return res.json({ 
      success: true, 
      data: payment,
      message: 'Payment proof uploaded successfully! Waiting for admin verification.'
    });
  } catch (error) {
    console.error('❌ Upload payment proof error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// ADMIN - GET ALL PAYMENTS
// ============================================================================
const getAllPayments = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
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

    console.log(`📋 Found ${payments.length} payments with status: ${status || 'all'}`);

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
    console.error('❌ Get payments error:', error);
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
    const adminId = req.user.id;

    console.log('🔍 Admin verifying payment:', { paymentId, verifiedTransactionId, adminId });

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

    console.log('📋 Payment found:', { id: payment.id, status: payment.paymentStatus, hasProof: !!payment.paymentProofUrl });

    // Check if proof was uploaded
    if (!payment.paymentProofUrl || !payment.transactionId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot verify. Intern has not uploaded payment proof yet.' 
      });
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

    console.log('✅ Payment status updated to VERIFIED');

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

        console.log('✅ Certificate issued:', certificateNumber);

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

        console.log('✅ Certificate session created');
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

    console.log('✅ Intern notified');

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'PAYMENT_VERIFIED',
        userId: adminId,
        details: `Verified payment ${paymentId} for ${payment.user.name} - Amount: ₹${payment.amount}`,
        ipAddress: req.ip || 'unknown'
      }
    });

    console.log('✅ Audit log created');

    return res.json({ 
      success: true, 
      data: updated,
      message: 'Payment verified and certificate issued successfully!'
    });
  } catch (error) {
    console.error('❌ Verify payment error:', error);
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
    const adminId = req.user.id;

    console.log('❌ Admin rejecting payment:', { paymentId, rejectionReason, adminId });

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

    console.log('📋 Payment found:', { id: payment.id, status: payment.paymentStatus });

    // Update payment
    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        paymentStatus: 'REJECTED',
        rejectionReason: rejectionReason.trim()
      }
    });

    console.log('✅ Payment status updated to REJECTED');

    // Reset enrollment certificate purchase
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: payment.userId,
        internshipId: payment.internshipId
      }
    });

    if (enrollment) {
      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: {
          certificatePurchased: false,
          certificateIssued: false,
          certificateNumber: null
        }
      });
      console.log('✅ Enrollment reset - can retry payment');
    }

    // Send rejection notification to intern
    await prisma.notification.create({
      data: {
        userId: payment.userId,
        title: '❌ Payment Rejected',
        message: `Your payment of ₹${payment.amount} was rejected.\n\nReason: ${rejectionReason}\n\nPlease review and try again with correct payment details.`,
        type: 'ERROR'
      }
    });

    console.log('✅ Intern notified');

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'PAYMENT_REJECTED',
        userId: adminId,
        details: `Rejected payment ${paymentId} for ${payment.user.name} - Reason: ${rejectionReason}`,
        ipAddress: req.ip || 'unknown'
      }
    });

    console.log('✅ Audit log created');

    return res.json({ 
      success: true, 
      data: updated,
      message: 'Payment rejected successfully!'
    });
  } catch (error) {
    console.error('❌ Reject payment error:', error);
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
    console.error('❌ Get intern payments error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// GET PAYMENT BY ID
// ============================================================================
const getPaymentById = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

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

    // Only allow user to see their own payment, or admin to see any
    if (userRole !== 'ADMIN' && payment.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    return res.json({ success: true, data: payment });
  } catch (error) {
    console.error('❌ Get payment error:', error);
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