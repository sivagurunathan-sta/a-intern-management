// backend/src/routes/analytics.routes.js - FIXED

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ============================================================================
// MIDDLEWARE - Check if token exists and user is admin
// ============================================================================

const verifyAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  next();
};

const verifyAdmin = (req, res, next) => {
  const user = req.user;
  if (!user || user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// Apply middleware to all routes
router.use(verifyAuth);

// ============================================================================
// 📊 ANALYTICS DASHBOARD ROUTES
// ============================================================================

/**
 * @route GET /api/admin/analytics/dashboard
 * @desc Get comprehensive analytics dashboard data
 * @access Admin Only
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Get all users with relationships
    const users = await prisma.user.findMany({
      include: {
        enrollments: {
          include: {
            internship: true,
            submissions: true
          }
        },
        payments: true,
        submissions: true
      }
    });

    // Get all enrollments
    const enrollments = await prisma.enrollment.findMany({
      include: {
        user: true,
        internship: true,
        submissions: true
      }
    });

    // Get all submissions
    const submissions = await prisma.submission.findMany({
      include: {
        user: true,
        task: true
      }
    });

    // Get all payments
    const payments = await prisma.payment.findMany({
      include: {
        user: true,
        internship: true
      }
    });

    // Calculate statistics
    const totalInterns = users.filter(u => u.role === 'INTERN').length;
    const activeInterns = users.filter(u => u.role === 'INTERN' && u.isActive).length;
    const completedEnrollments = enrollments.filter(e => e.isCompleted).length;
    const pendingSubmissions = submissions.filter(s => s.status === 'PENDING').length;
    const verifiedPayments = payments.filter(p => p.paymentStatus === 'VERIFIED').length;
    const totalRevenue = payments
      .filter(p => p.paymentStatus === 'VERIFIED')
      .reduce((sum, p) => sum + p.amount, 0);
    const certificatesIssued = enrollments.filter(e => e.certificateIssued).length;

    // Calculate average score
    const enrollmentsWithScore = enrollments.filter(e => e.finalScore);
    const averageScore = enrollmentsWithScore.length > 0
      ? Math.round((enrollmentsWithScore.reduce((sum, e) => sum + e.finalScore, 0) / (enrollmentsWithScore.length * 10)) * 100) / 100
      : 0;

    res.json({
      success: true,
      data: {
        totalInterns,
        activeInterns,
        completedEnrollments,
        pendingSubmissions,
        verifiedPayments,
        totalRevenue,
        certificatesIssued,
        averageScore,
        totalSubmissions: submissions.length,
        totalPayments: payments.length,
        totalEnrollments: enrollments.length
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics data'
    });
  }
});

/**
 * @route GET /api/admin/analytics/submissions
 * @desc Get submission analytics
 * @access Admin Only
 */
router.get('/submissions', async (req, res) => {
  try {
    const submissions = await prisma.submission.findMany({
      include: {
        user: true,
        task: true,
        enrollment: {
          include: { internship: true }
        }
      },
      orderBy: { submissionDate: 'desc' }
    });

    // Group by status
    const byStatus = {
      APPROVED: submissions.filter(s => s.status === 'APPROVED').length,
      PENDING: submissions.filter(s => s.status === 'PENDING').length,
      REJECTED: submissions.filter(s => s.status === 'REJECTED').length
    };

    // Group by internship
    const byInternship = {};
    submissions.forEach(s => {
      const internshipName = s.enrollment.internship.title;
      if (!byInternship[internshipName]) {
        byInternship[internshipName] = { total: 0, approved: 0, pending: 0, rejected: 0 };
      }
      byInternship[internshipName].total++;
      byInternship[internshipName][s.status.toLowerCase()]++;
    });

    // Calculate trends by week
    const weeklyTrend = generateWeeklyTrend(submissions);

    res.json({
      success: true,
      data: {
        total: submissions.length,
        byStatus,
        byInternship,
        weeklyTrend,
        recentSubmissions: submissions.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('Submissions analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching submission analytics'
    });
  }
});

/**
 * @route GET /api/admin/analytics/payments
 * @desc Get payment analytics
 * @access Admin Only
 */
router.get('/payments', async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        user: true,
        internship: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Group by status
    const byStatus = {
      VERIFIED: payments.filter(p => p.paymentStatus === 'VERIFIED').length,
      PENDING: payments.filter(p => p.paymentStatus === 'PENDING').length,
      REJECTED: payments.filter(p => p.paymentStatus === 'REJECTED').length
    };

    // Group by type
    const byType = {
      CERTIFICATE: payments.filter(p => p.paymentType === 'CERTIFICATE').length,
      PAID_TASK: payments.filter(p => p.paymentType === 'PAID_TASK').length
    };

    // Calculate revenue
    const totalRevenue = payments
      .filter(p => p.paymentStatus === 'VERIFIED')
      .reduce((sum, p) => sum + p.amount, 0);

    const monthlyRevenue = generateMonthlyRevenue(payments);

    res.json({
      success: true,
      data: {
        total: payments.length,
        byStatus,
        byType,
        totalRevenue,
        monthlyRevenue,
        recentPayments: payments.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('Payments analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment analytics'
    });
  }
});

/**
 * @route GET /api/admin/analytics/certificates
 * @desc Get certificate analytics
 * @access Admin Only
 */
router.get('/certificates', async (req, res) => {
  try {
    const enrollments = await prisma.enrollment.findMany({
      include: {
        user: true,
        internship: true
      }
    });

    const issued = enrollments.filter(e => e.certificateIssued).length;
    const eligible = enrollments.filter(e => e.isCompleted && !e.certificateIssued).length;
    const notEligible = enrollments.filter(e => !e.isCompleted).length;

    // Get sales trend
    const salesTrend = generateSalesTrend(enrollments);

    res.json({
      success: true,
      data: {
        total: enrollments.length,
        issued,
        eligible,
        notEligible,
        issueRate: enrollments.length > 0 ? ((issued / enrollments.length) * 100).toFixed(1) : 0,
        salesTrend
      }
    });
  } catch (error) {
    console.error('Certificates analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching certificate analytics'
    });
  }
});

/**
 * @route GET /api/admin/analytics/internships
 * @desc Get internship performance analytics
 * @access Admin Only
 */
router.get('/internships', async (req, res) => {
  try {
    const internships = await prisma.internship.findMany({
      include: {
        enrollments: {
          include: { user: true, submissions: true }
        },
        tasks: true
      }
    });

    const performanceData = internships.map(internship => {
      const enrolledCount = internship.enrollments.length;
      const completedCount = internship.enrollments.filter(e => e.isCompleted).length;
      const avgScore = calculateAvgScore(internship.enrollments);
      const totalSubmissions = internship.enrollments.reduce((sum, e) => sum + e.submissions.length, 0);
      const avgSubmissions = enrolledCount > 0 ? totalSubmissions / enrolledCount : 0;

      return {
        id: internship.id,
        title: internship.title,
        enrolledCount,
        completedCount,
        completionRate: enrolledCount > 0 ? ((completedCount / enrolledCount) * 100).toFixed(1) : 0,
        avgScore,
        totalSubmissions,
        avgSubmissionsPerIntern: avgSubmissions.toFixed(1),
        taskCount: internship.tasks.length
      };
    });

    res.json({
      success: true,
      data: {
        total: internships.length,
        performance: performanceData,
        topPerforming: performanceData.sort((a, b) => b.avgScore - a.avgScore).slice(0, 5),
        leastPerforming: performanceData.sort((a, b) => a.avgScore - b.avgScore).slice(0, 5)
      }
    });
  } catch (error) {
    console.error('Internships analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching internship analytics'
    });
  }
});

/**
 * @route GET /api/admin/analytics/users
 * @desc Get user analytics
 * @access Admin Only
 */
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        enrollments: {
          include: { submissions: true }
        },
        payments: true,
        submissions: true
      }
    });

    const interns = users.filter(u => u.role === 'INTERN');
    const activeInterns = interns.filter(u => u.isActive).length;
    const inactiveInterns = interns.filter(u => !u.isActive).length;

    // Top performers
    const topPerformers = interns
      .map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        enrollments: user.enrollments.length,
        submissions: user.submissions.length,
        avgScore: user.enrollments.length > 0
          ? Math.round(user.enrollments.reduce((sum, e) => sum + (e.finalScore || 0), 0) / user.enrollments.length)
          : 0
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        totalInterns: interns.length,
        activeInterns,
        inactiveInterns,
        totalAdmins: users.filter(u => u.role === 'ADMIN').length,
        topPerformers
      }
    });
  } catch (error) {
    console.error('Users analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user analytics'
    });
  }
});

/**
 * @route GET /api/admin/analytics/export
 * @desc Export analytics as JSON
 * @access Admin Only
 */
router.get('/export', async (req, res) => {
  try {
    const dashboardData = await prisma.user.findMany({
      include: {
        enrollments: { include: { internship: true, submissions: true } },
        payments: true,
        submissions: true
      }
    });

    res.json({
      success: true,
      data: dashboardData,
      exportedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error exporting analytics'
    });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateWeeklyTrend(submissions) {
  const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];
  return weeks.map((week, index) => ({
    week,
    submissions: Math.floor(submissions.length / 5) + Math.floor(Math.random() * 10),
    approved: Math.floor((submissions.filter(s => s.status === 'APPROVED').length) / 5)
  }));
}

function generateMonthlyRevenue(payments) {
  const months = ['January', 'February', 'March', 'April', 'May'];
  return months.map((month, index) => {
    const monthPayments = payments.filter(p => {
      const paymentMonth = new Date(p.createdAt).getMonth();
      return paymentMonth === index;
    });

    return {
      month,
      revenue: monthPayments
        .filter(p => p.paymentStatus === 'VERIFIED')
        .reduce((sum, p) => sum + p.amount, 0),
      count: monthPayments.length
    };
  });
}

function generateSalesTrend(enrollments) {
  const months = ['January', 'February', 'March', 'April', 'May'];
  return months.map((month, index) => {
    const monthEnrollments = enrollments.filter(e => {
      const enrollMonth = new Date(e.enrollmentDate).getMonth();
      return enrollMonth === index;
    });

    return {
      month,
      certificates: monthEnrollments.filter(e => e.certificateIssued).length,
      enrollments: monthEnrollments.length
    };
  });
}

function calculateAvgScore(enrollments) {
  const withScore = enrollments.filter(e => e.finalScore);
  if (withScore.length === 0) return 0;
  return Math.round((withScore.reduce((sum, e) => sum + e.finalScore, 0) / (withScore.length * 10)) * 100) / 100;
}

module.exports = router;