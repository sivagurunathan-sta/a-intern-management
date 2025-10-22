// backend/src/controllers/internship.controller.js - COMPLETE UPDATE

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all internships
const getAllInternships = async (req, res) => {
  try {
    const internships = await prisma.internship.findMany({
      where: { isActive: true },
      include: {
        tasks: {
          select: { id: true }
        },
        _count: {
          select: { enrollments: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: internships });
  } catch (error) {
    console.error('Get internships error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single internship
const getInternshipById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const internship = await prisma.internship.findUnique({
      where: { id },
      include: {
        tasks: true,
        _count: {
          select: { enrollments: true }
        }
      }
    });

    if (!internship) {
      return res.status(404).json({ success: false, message: 'Internship not found' });
    }

    res.json({ success: true, data: internship });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create internship
const createInternship = async (req, res) => {
  try {
    const { title, description, durationDays, certificatePrice, passPercentage, price, coverImage } = req.body;

    if (!title || !description) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title and description are required' 
      });
    }

    const internship = await prisma.internship.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        durationDays: parseInt(durationDays) || 35,
        certificatePrice: parseInt(certificatePrice) || 499,
        passPercentage: parseInt(passPercentage) || 75,
        price: parseInt(price) || 0,
        coverImage: coverImage || null
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'INTERNSHIP_CREATED',
        userId: req.user.id,
        details: `Internship created: ${title}`,
        ipAddress: req.ip
      }
    });

    res.json({ success: true, data: internship, message: 'Internship created successfully' });
  } catch (error) {
    console.error('Create internship error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update internship
const updateInternship = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, durationDays, certificatePrice, passPercentage, price, coverImage } = req.body;

    // Check if internship exists
    const existingInternship = await prisma.internship.findUnique({
      where: { id }
    });

    if (!existingInternship) {
      return res.status(404).json({ success: false, message: 'Internship not found' });
    }

    const internship = await prisma.internship.update({
      where: { id },
      data: {
        title: title || existingInternship.title,
        description: description || existingInternship.description,
        durationDays: durationDays ? parseInt(durationDays) : existingInternship.durationDays,
        certificatePrice: certificatePrice ? parseInt(certificatePrice) : existingInternship.certificatePrice,
        passPercentage: passPercentage ? parseInt(passPercentage) : existingInternship.passPercentage,
        price: price ? parseInt(price) : existingInternship.price,
        coverImage: coverImage || existingInternship.coverImage
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'INTERNSHIP_UPDATED',
        userId: req.user.id,
        details: `Internship updated: ${internship.title}`,
        ipAddress: req.ip
      }
    });

    res.json({ success: true, data: internship, message: 'Internship updated successfully' });
  } catch (error) {
    console.error('Update internship error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete internship - CASCADE DELETE via Prisma
const deleteInternship = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify admin
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only admins can delete internships' });
    }

    // Check if internship exists
    const internship = await prisma.internship.findUnique({
      where: { id },
      include: {
        _count: {
          select: { 
            enrollments: true,
            tasks: true
          }
        }
      }
    });

    if (!internship) {
      return res.status(404).json({ success: false, message: 'Internship not found' });
    }

    const internshipTitle = internship.title;
    const enrollmentCount = internship._count.enrollments;
    const taskCount = internship._count.tasks;

    // Delete internship - Prisma will handle cascading deletes based on schema
    // All related data (enrollments, tasks, submissions, payments, etc.) will be automatically deleted
    const deletedInternship = await prisma.internship.delete({
      where: { id }
    });

    await prisma.auditLog.create({
      data: {
        action: 'INTERNSHIP_DELETED',
        userId: userId,
        details: `Internship deleted: ${internshipTitle} (${enrollmentCount} enrollments, ${taskCount} tasks removed)`,
        ipAddress: req.ip
      }
    });

    // Notify all enrolled interns
    const enrollments = await prisma.enrollment.findMany({
      where: { internshipId: id },
      select: { userId: true }
    }).catch(() => []);

    for (const enrollment of enrollments) {
      try {
        await prisma.notification.create({
          data: {
            userId: enrollment.userId,
            title: 'Internship Removed',
            message: `The internship "${internshipTitle}" has been removed by admin. Your enrollment and progress have been deleted.`,
            type: 'WARNING'
          }
        }).catch(() => {});
      } catch (e) {
        console.error('Error notifying user:', e);
      }
    }

    res.json({
      success: true,
      message: 'Internship deleted successfully along with all related data',
      data: {
        deletedInternship: deletedInternship.title,
        enrollmentsRemoved: enrollmentCount,
        tasksRemoved: taskCount
      }
    });

  } catch (error) {
    console.error('Delete internship error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Enroll in internship
const enrollInternship = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if internship exists and is active
    const internship = await prisma.internship.findUnique({
      where: { id }
    });

    if (!internship || !internship.isActive) {
      return res.status(404).json({ success: false, message: 'Internship not found or unavailable' });
    }

    // Check if already enrolled
    const existing = await prisma.enrollment.findFirst({
      where: { userId, internshipId: id }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Already enrolled in this internship' });
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        userId,
        internshipId: id,
        enrollmentDate: new Date(),
        finalScore: 0,
        isCompleted: false
      }
    });

    // Send welcome notification
    await prisma.notification.create({
      data: {
        userId,
        title: '🎉 Welcome!',
        message: `You have been enrolled in ${internship.title}. Start your first task now!`,
        type: 'SUCCESS'
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'ENROLLMENT_CREATED',
        userId: userId,
        details: `Enrolled in internship: ${internship.title}`,
        ipAddress: req.ip
      }
    });

    res.json({ success: true, data: enrollment, message: 'Enrolled successfully' });
  } catch (error) {
    console.error('Enroll error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Unenroll from internship
const unenrollInternship = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const userId = req.user.id;

    // Verify enrollment exists
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { internship: true }
    });

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    // Verify ownership
    if (enrollment.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized - You can only unenroll from your own internships' });
    }

    const internshipTitle = enrollment.internship.title;

    // Delete enrollment - Prisma will cascade delete related records
    // (submissions, task unlocks, resubmission opportunities, etc.)
    await prisma.enrollment.delete({
      where: { id: enrollmentId }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'ENROLLMENT_DELETED',
        userId: userId,
        details: `Unenrolled from internship: ${internshipTitle}`,
        ipAddress: req.ip
      }
    });

    res.json({ 
      success: true, 
      message: 'Unenrolled successfully - All your progress and submissions have been removed'
    });
  } catch (error) {
    console.error('Unenroll error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get intern enrollments
const getInternEnrollments = async (req, res) => {
  try {
    const userId = req.user.id;

    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      include: {
        internship: {
          include: {
            tasks: {
              select: { id: true }
            }
          }
        },
        submissions: {
          select: {
            status: true,
            score: true
          }
        }
      },
      orderBy: { enrollmentDate: 'desc' }
    });

    // Add computed fields
    const enrichedEnrollments = enrollments.map(enrollment => {
      const completedTasks = enrollment.submissions.filter(s => s.status === 'APPROVED').length;
      const totalTasks = enrollment.internship.tasks.length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        ...enrollment,
        completedTasks,
        totalTasks,
        progress
      };
    });

    res.json({ success: true, data: enrichedEnrollments });
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllInternships,
  getInternshipById,
  createInternship,
  updateInternship,
  deleteInternship,
  enrollInternship,
  unenrollInternship,
  getInternEnrollments
};