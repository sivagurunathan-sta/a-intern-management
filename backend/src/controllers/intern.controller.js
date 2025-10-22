// backend/src/controllers/intern.controller.js - UPDATED

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get intern profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get intern enrollments
const getEnrollments = async (req, res) => {
  try {
    const userId = req.user.id;

    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      include: {
        internship: {
          include: {
            tasks: {
              select: { id: true, taskNumber: true }
            }
          }
        },
        submissions: {
          select: {
            status: true,
            score: true,
            taskId: true
          }
        }
      },
      orderBy: { enrollmentDate: 'desc' }
    });

    // Enrich data with computed fields
    const enrichedEnrollments = enrollments.map(enrollment => {
      const approvedSubmissions = enrollment.submissions.filter(s => s.status === 'APPROVED');
      const completedTasks = approvedSubmissions.length;
      const totalTasks = enrollment.internship.tasks.length || 35;
      const totalPoints = totalTasks * 10;
      const currentPoints = approvedSubmissions.reduce((sum, sub) => sum + (sub.score || 0), 0);
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const isEligibleForCertificate = enrollment.isCompleted && 
        (currentPoints / totalPoints) * 100 >= (enrollment.internship.passPercentage || 75);

      return {
        ...enrollment,
        completedTasks,
        totalTasks,
        progress,
        currentPoints,
        totalPoints,
        isEligibleForCertificate
      };
    });

    res.json({ success: true, data: enrichedEnrollments });
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get enrollment details
const getEnrollmentDetails = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const userId = req.user.id;

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        internship: true,
        submissions: {
          include: {
            task: true
          }
        }
      }
    });

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    if (enrollment.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    res.json({ success: true, data: enrollment });
  } catch (error) {
    console.error('Get enrollment details error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get internship tasks with submission status
const getInternshipTasks = async (req, res) => {
  try {
    const { internshipId } = req.params;
    const userId = req.user.id;

    // Verify enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId,
        internshipId
      }
    });

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Not enrolled in this internship' });
    }

    // Get tasks with submission status
    const tasks = await prisma.task.findMany({
      where: { internshipId, isActive: true },
      orderBy: { taskNumber: 'asc' },
      include: {
        submissions: {
          where: { userId },
          orderBy: { submissionDate: 'desc' },
          take: 1
        }
      }
    });

    // Add unlock status and submission info
    const tasksWithStatus = tasks.map(task => {
      const submission = task.submissions[0];
      const isUnlocked = task.taskNumber <= enrollment.currentUnlockedTask;
      
      return {
        ...task,
        isUnlocked,
        canSubmit: isUnlocked && (!submission || submission.status === 'REJECTED'),
        submission: submission || null,
        submissionStatus: submission?.status || null
      };
    });

    res.json({ success: true, data: tasksWithStatus });
  } catch (error) {
    console.error('Get internship tasks error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get notifications
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({ success: true, data: notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark notification as read
const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Mark notification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get enrollments with stats
    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      include: {
        internship: {
          select: { id: true, title: true, durationDays: true }
        },
        submissions: {
          select: { status: true, score: true }
        }
      }
    });

    // Get pending notifications
    const pendingNotifications = await prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    });

    // Calculate statistics
    const totalEnrollments = enrollments.length;
    const activeEnrollments = enrollments.filter(e => !e.isCompleted).length;
    const completedEnrollments = enrollments.filter(e => e.isCompleted).length;

    let totalPoints = 0;
    let completedTasks = 0;
    
    enrollments.forEach(enrollment => {
      const approved = enrollment.submissions.filter(s => s.status === 'APPROVED');
      completedTasks += approved.length;
      totalPoints += approved.reduce((sum, s) => sum + (s.score || 0), 0);
    });

    res.json({
      success: true,
      data: {
        totalEnrollments,
        activeEnrollments,
        completedEnrollments,
        completedTasks,
        totalPoints,
        pendingNotifications
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProfile,
  getEnrollments,
  getEnrollmentDetails,
  getInternshipTasks,
  getNotifications,
  markNotificationAsRead,
  getDashboardStats
};