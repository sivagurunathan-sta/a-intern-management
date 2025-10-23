// backend/src/controllers/payment.controller.js - COMPLETE WITH ALL FUNCTIONS
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');
const prisma = new PrismaClient();

// ============================================================================
// ADMIN: VERIFY PAYMENT - Creates certificate session when approved
// ============================================================================
const verifyPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { verifiedTransactionId } = req.body; // ✅ CHANGED from 'action'
    const adminId = req.user.id;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: true,
        internship: true
      }
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (payment.paymentStatus !== 'PENDING') {
      return res.status(400).json({ 
        success: false, 
        message: `Payment already ${payment.paymentStatus.toLowerCase()}` 
      });
    }

    // ✅ APPROVE PAYMENT
    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        paymentStatus: 'VERIFIED',
        verifiedTransactionId: verifiedTransactionId || payment.transactionId,
        verifiedAt: new Date()
      }
    });

    // ✅ CREATE CERTIFICATE SESSION when payment is approved
    if (payment.paymentType === 'CERTIFICATE') {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          userId: payment.userId,
          internshipId: payment.internshipId
        }
      });

      if (enrollment) {
        // Generate certificate number
        const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        
        // Create certificate session
        await prisma.certificateSession.create({
          data: {
            enrollmentId: enrollment.id,
            userId: payment.userId,
            paymentId: payment.id,
            certificateNumber,
            status: 'PENDING_UPLOAD', // Admin needs to upload certificate PDF
            sessionStartedAt: new Date(),
            expectedDeliveryAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
          }
        });

        // Update enrollment
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            certificatePurchased: true
          }
        });
      }
    }

    // Send notification
    await prisma.notification.create({
      data: {
        userId: payment.userId,
        title: '✅ Payment Verified',
        message: payment.paymentType === 'CERTIFICATE' 
          ? 'Your certificate payment has been verified! Your certificate will be ready within 3 days.'
          : 'Your payment has been verified successfully!',
        type: 'SUCCESS'
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'PAYMENT_VERIFIED',
        userId: adminId,
        details: `Payment verified: ₹${payment.amount} for ${payment.user.name}`,
        ipAddress: req.ip
      }
    });

    res.json({ 
      success: true, 
      data: updated, 
      message: 'Payment verified and certificate session created successfully' 
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// ADMIN: GET PENDING PAYMENTS
// ============================================================================
const getPendingPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { paymentStatus: 'PENDING' },
        include: {
          user: { select: { id: true, userId: true, name: true, email: true } },
          internship: { select: { title: true } },
          paidTask: { select: { title: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.payment.count({ where: { paymentStatus: 'PENDING' } })
    ]);

    res.json({
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
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// ADMIN: GET ALL PAYMENTS (with optional filter)
// ============================================================================
const getAllPayments = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { paymentStatus: status } : {};

    const payments = await prisma.payment.findMany({
      where: filter,
      include: {
        user: { select: { id: true, userId: true, name: true, email: true } },
        internship: { select: { title: true } },
        paidTask: { select: { title: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: { payments } });
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// INTERN: INITIATE CERTIFICATE PAYMENT
// ============================================================================
const initiateCertificatePayment = async (req, res) => {
  try {
    const { enrollmentId } = req.body;
    const userId = req.user.id;

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { internship: true }
    });

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    if (enrollment.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (!enrollment.isCompleted) {
      return res.status(400).json({ 
        success: false, 
        message: 'Complete the internship first to purchase certificate' 
      });
    }

    if (enrollment.certificatePurchased) {
      return res.status(400).json({ 
        success: false, 
        message: 'Certificate already purchased' 
      });
    }

    // Check if already has pending payment
    const existingPayment = await prisma.payment.findFirst({
      where: {
        userId,
        internshipId: enrollment.internshipId,
        paymentType: 'CERTIFICATE',
        paymentStatus: 'PENDING'
      }
    });

    if (existingPayment) {
      return res.json({
        success: true,
        data: {
          enrollmentId: enrollment.id,
          internshipId: enrollment.internshipId,
          amount: enrollment.internship.certificatePrice,
          qrCodeUrl: '/uploads/qr/payment-qr.png'
        },
        message: 'You already have a pending payment'
      });
    }

    res.json({
      success: true,
      data: {
        enrollmentId: enrollment.id,
        internshipId: enrollment.internshipId,
        amount: enrollment.internship.certificatePrice,
        qrCodeUrl: '/uploads/qr/payment-qr.png'
      }
    });
  } catch (error) {
    console.error('Initiate payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// INTERN: UPLOAD PAYMENT PROOF (Submit payment proof)
// ============================================================================
const verifyPaymentAndIssueCertificate = async (req, res) => {
  try {
    const { enrollmentId, internshipId, amount, transactionId } = req.body;
    const userId = req.user.id;

    if (!req.files || !req.files.paymentProof) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment proof screenshot is required' 
      });
    }

    if (!transactionId || transactionId.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Transaction ID is required' 
      });
    }

    // Upload payment proof
    const paymentProof = req.files.paymentProof;
    const uploadDir = path.join(__dirname, '../../uploads/payment-proofs');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const fileName = `PAYMENT-${userId}-${Date.now()}.jpg`;
    const filePath = `/uploads/payment-proofs/${fileName}`;
    await paymentProof.mv(path.join(uploadDir, fileName));

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId,
        internshipId,
        amount: parseFloat(amount),
        paymentType: 'CERTIFICATE',
        paymentStatus: 'PENDING',
        transactionId: transactionId.trim(),
        paymentProofUrl: filePath
      }
    });

    // Notification
    await prisma.notification.create({
      data: {
        userId,
        title: '⏳ Payment Submitted',
        message: 'Your payment proof has been submitted. Admin will verify it within 24 hours.',
        type: 'INFO'
      }
    });

    res.json({ 
      success: true, 
      data: payment, 
      message: 'Payment proof submitted successfully. Waiting for admin verification.' 
    });
  } catch (error) {
    console.error('Upload payment proof error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// INTERN: INITIATE PAID TASK PAYMENT
// ============================================================================
const initiatePaidTaskPayment = async (req, res) => {
  try {
    const { taskId } = req.body;
    const userId = req.user.id;

    // Check if intern has certificate
    const hasCertificate = await prisma.certificateSession.findFirst({
      where: {
        userId,
        status: 'ISSUED'
      }
    });

    if (!hasCertificate) {
      return res.status(403).json({ 
        success: false, 
        message: 'Certificate required to access paid tasks' 
      });
    }

    // Check if task exists
    const task = await prisma.paidTask.findUnique({
      where: { id: taskId }
    });

    if (!task || !task.isActive) {
      return res.status(404).json({ success: false, message: 'Task not found or inactive' });
    }

    // Check if already paid
    const existingPayment = await prisma.payment.findFirst({
      where: {
        userId,
        paidTaskId: taskId,
        paymentType: 'PAID_TASK',
        paymentStatus: 'VERIFIED'
      }
    });

    if (existingPayment) {
      return res.status(400).json({ success: false, message: 'Task already purchased' });
    }

    res.json({
      success: true,
      data: {
        taskId: task.id,
        amount: 1000,
        qrCodeUrl: '/uploads/qr/payment-qr.png'
      }
    });
  } catch (error) {
    console.error('Initiate paid task payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// INTERN: VERIFY PAID TASK PAYMENT (Submit proof)
// ============================================================================
const verifyPaidTaskPayment = async (req, res) => {
  try {
    const { taskId, amount, transactionId } = req.body;
    const userId = req.user.id;

    if (!req.files || !req.files.paymentProof) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment proof screenshot is required' 
      });
    }

    const paymentProof = req.files.paymentProof;
    const uploadDir = path.join(__dirname, '../../uploads/payment-proofs');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const fileName = `PAIDTASK-${userId}-${Date.now()}.jpg`;
    const filePath = `/uploads/payment-proofs/${fileName}`;
    await paymentProof.mv(path.join(uploadDir, fileName));

    const payment = await prisma.payment.create({
      data: {
        userId,
        paidTaskId: taskId,
        amount: parseFloat(amount),
        paymentType: 'PAID_TASK',
        paymentStatus: 'PENDING',
        transactionId: transactionId.trim(),
        paymentProofUrl: filePath
      }
    });

    res.json({ 
      success: true, 
      data: payment, 
      message: 'Payment proof submitted successfully' 
    });
  } catch (error) {
    console.error('Submit paid task payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// INTERN: GET MY PAYMENTS
// ============================================================================
const getMyPayments = async (req, res) => {
  try {
    const userId = req.user.id;

    const payments = await prisma.payment.findMany({
      where: { userId },
      include: {
        internship: { select: { title: true } },
        paidTask: { select: { title: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: { payments } });
  } catch (error) {
    console.error('Get my payments error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// ADMIN: GET PAYMENT STATS
// ============================================================================
const getPaymentStats = async (req, res) => {
  try {
    const totalRevenue = await prisma.payment.aggregate({
      where: { paymentStatus: 'VERIFIED' },
      _sum: { amount: true }
    });

    const pendingCount = await prisma.payment.count({
      where: { paymentStatus: 'PENDING' }
    });

    const verifiedCount = await prisma.payment.count({
      where: { paymentStatus: 'VERIFIED' }
    });

    const rejectedCount = await prisma.payment.count({
      where: { paymentStatus: 'REJECTED' }
    });

    res.json({
      success: true,
      data: {
        totalRevenue: totalRevenue._sum.amount || 0,
        pendingCount,
        verifiedCount,
        rejectedCount
      }
    });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ EXPORT ALL FUNCTIONS
module.exports = {
  verifyPayment,                       // Admin verifies payment
  getPendingPayments,                  // Admin gets pending payments
  getAllPayments,                      // Admin gets all payments
  initiateCertificatePayment,          // Intern initiates certificate payment
  verifyPaymentAndIssueCertificate,    // Intern submits payment proof
  initiatePaidTaskPayment,             // Intern initiates paid task payment
  verifyPaidTaskPayment,               // Intern submits paid task proof
  getMyPayments,                       // Intern gets their payments
  getPaymentStats                      // Admin gets payment statistics
};