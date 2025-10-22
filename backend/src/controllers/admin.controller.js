// backend/src/controllers/admin.controller.js - UPDATED
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { userId: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          userId: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          isActive: true,
          createdAt: true,
          enrollments: {
            include: {
              internship: { select: { title: true } },
              submissions: { select: { status: true } }
            }
          },
          chatPermission: true,
          payments: {
            select: {
              id: true,
              amount: true,
              paymentType: true,
              paymentStatus: true,
              createdAt: true
            }
          }
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        users,
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

// Get detailed user information
const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        enrollments: {
          include: {
            internship: {
              select: {
                id: true,
                title: true,
                description: true,
                durationDays: true,
                certificatePrice: true
              }
            },
            submissions: {
              include: {
                task: {
                  select: {
                    taskNumber: true,
                    title: true,
                    points: true
                  }
                }
              },
              orderBy: { submissionDate: 'desc' }
            }
          }
        },
        payments: {
          include: {
            internship: { select: { title: true } },
            paidTask: { select: { title: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        submissions: {
          include: {
            task: {
              select: {
                taskNumber: true,
                title: true,
                points: true
              }
            },
            enrollment: {
              select: {
                internship: {
                  select: { title: true }
                }
              }
            }
          },
          orderBy: { submissionDate: 'desc' }
        },
        chatPermission: true,
        notifications: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Calculate statistics
    const stats = {
      totalEnrollments: user.enrollments.length,
      completedEnrollments: user.enrollments.filter(e => e.isCompleted).length,
      totalSubmissions: user.submissions.length,
      approvedSubmissions: user.submissions.filter(s => s.status === 'APPROVED').length,
      pendingSubmissions: user.submissions.filter(s => s.status === 'PENDING').length,
      rejectedSubmissions: user.submissions.filter(s => s.status === 'REJECTED').length,
      totalPayments: user.payments.length,
      verifiedPayments: user.payments.filter(p => p.paymentStatus === 'VERIFIED').length,
      pendingPayments: user.payments.filter(p => p.paymentStatus === 'PENDING').length,
      totalCertificates: user.enrollments.filter(e => e.certificateIssued).length,
      totalScore: user.enrollments.reduce((sum, e) => sum + (e.finalScore || 0), 0)
    };

    res.json({
      success: true,
      data: {
        user,
        stats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get user activity history
const getUserHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const [auditLogs, notifications] = await Promise.all([
      prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50
      })
    ]);

    res.json({
      success: true,
      data: {
        auditLogs,
        notifications
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Bulk add users
const bulkAddUsers = async (req, res) => {
  try {
    const { users } = req.body;
    
    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Users array is required' 
      });
    }

    const results = [];
    const errors = [];

    for (const userData of users) {
      try {
        // Check if user already exists
        const existing = await prisma.user.findFirst({
          where: {
            OR: [
              { email: userData.email },
              { userId: userData.userId }
            ]
          }
        });

        if (existing) {
          errors.push({
            userId: userData.userId,
            email: userData.email,
            error: 'User already exists'
          });
          continue;
        }

        const passwordHash = await bcrypt.hash(userData.password, 10);
        const user = await prisma.user.create({
          data: {
            userId: userData.userId,
            name: userData.name,
            email: userData.email,
            passwordHash,
            role: userData.role || 'INTERN',
            phone: userData.phone || null,
            isActive: true
          }
        });

        // Create welcome notification
        await prisma.notification.create({
          data: {
            userId: user.id,
            title: 'Welcome to Student LMS!',
            message: `Hello ${user.name}! Your account has been created. You can now enroll in internships and start learning.`,
            type: 'SUCCESS'
          }
        });

        results.push({
          id: user.id,
          userId: user.userId,
          name: user.name,
          email: user.email
        });
      } catch (error) {
        errors.push({
          userId: userData.userId,
          email: userData.email,
          error: error.message
        });
      }
    }

    res.json({ 
      success: true, 
      data: { 
        created: results, 
        errors,
        count: results.length 
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // Don't allow password update through this endpoint
    delete updates.passwordHash;
    delete updates.password;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updates
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'USER_UPDATED',
        userId: req.user.id,
        details: `Updated user ${user.userId} (${user.email})`,
        ipAddress: req.ip
      }
    });

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Revoke access
const revokeAccess = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive: false }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Account Access Revoked',
        message: 'Your account access has been temporarily suspended. Please contact the administrator.',
        type: 'WARNING'
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'ACCESS_REVOKED',
        userId: req.user.id,
        details: `Revoked access for user ${user.userId} (${user.email})`,
        ipAddress: req.ip
      }
    });

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Restore access
const restoreAccess = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive: true }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Account Access Restored',
        message: 'Your account access has been restored. You can now use the LMS.',
        type: 'SUCCESS'
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'ACCESS_RESTORED',
        userId: req.user.id,
        details: `Restored access for user ${user.userId} (${user.email})`,
        ipAddress: req.ip
      }
    });

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Enable chat for user
const enableChat = async (req, res) => {
  try {
    const { userId } = req.params;

    const chatPermission = await prisma.chatPermission.upsert({
      where: { userId },
      update: {
        isEnabled: true,
        enabledAt: new Date(),
        enabledBy: req.user.id
      },
      create: {
        userId,
        isEnabled: true,
        enabledAt: new Date(),
        enabledBy: req.user.id
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId,
        title: 'Chat Access Enabled',
        message: 'You now have access to chat with the administrator.',
        type: 'SUCCESS'
      }
    });

    res.json({ success: true, data: chatPermission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Disable chat for user
const disableChat = async (req, res) => {
  try {
    const { userId } = req.params;

    const chatPermission = await prisma.chatPermission.update({
      where: { userId },
      data: {
        isEnabled: false,
        disabledAt: new Date()
      }
    });

    res.json({ success: true, data: chatPermission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    const [
      totalInterns, 
      activeInterns, 
      totalSubmissions, 
      pendingSubmissions, 
      totalPayments, 
      pendingPayments,
      certificatesIssued
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'INTERN' } }),
      prisma.user.count({ where: { role: 'INTERN', isActive: true } }),
      prisma.submission.count(),
      prisma.submission.count({ where: { status: 'PENDING' } }),
      prisma.payment.count(),
      prisma.payment.count({ where: { paymentStatus: 'PENDING' } }),
      prisma.enrollment.count({ where: { certificateIssued: true } })
    ]);

    res.json({
      success: true,
      data: {
        totalInterns,
        activeInterns,
        totalSubmissions,
        pendingSubmissions,
        totalPayments,
        pendingPayments,
        certificatesIssued
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllUsers,
  getUserDetails,
  getUserHistory,
  bulkAddUsers,
  updateUser,
  revokeAccess,
  restoreAccess,
  enableChat,
  disableChat,
  getDashboardStats
};