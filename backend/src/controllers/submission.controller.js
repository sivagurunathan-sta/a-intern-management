const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');
const prisma = new PrismaClient();

// Submit task
const submitTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;
    const { githubUrl, formData } = req.body;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { internship: true }
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_internshipId: {
          userId,
          internshipId: task.internshipId
        }
      }
    });

    if (!enrollment) {
      return res.status(400).json({ success: false, message: 'Not enrolled in this internship' });
    }

    if (task.taskNumber > enrollment.currentUnlockedTask) {
      return res.status(400).json({ success: false, message: 'Task is locked' });
    }

    let fileUrl = null;
    if (req.files && req.files.file) {
      const file = req.files.file;
      const uploadDir = path.join(__dirname, '../../uploads/submissions');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      const fileName = `${Date.now()}_${file.name}`;
      fileUrl = `/uploads/submissions/${fileName}`;
      await file.mv(path.join(uploadDir, fileName));
    }

    const submission = await prisma.submission.create({
      data: {
        enrollmentId: enrollment.id,
        taskId,
        userId,
        submissionType: task.submissionType,
        githubUrl,
        formData,
        fileUrl,
        status: 'PENDING'
      }
    });

    const waitTime = new Date(Date.now() + task.waitTimeHours * 60 * 60 * 1000);
    await prisma.taskUnlock.create({
      data: {
        enrollmentId: enrollment.id,
        taskId,
        unlocksAt: waitTime,
        isUnlocked: false
      }
    });

    await prisma.notification.create({
      data: {
        userId,
        title: 'Task Submitted',
        message: `Your submission for ${task.title} is under review`,
        type: 'INFO'
      }
    });

    res.json({ success: true, data: submission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all submissions (Admin)
const getAllSubmissions = async (req, res) => {
  try {
    const { status, internshipId, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (internshipId) {
      where.task = { internshipId };
    }

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        include: {
          user: { select: { userId: true, name: true, email: true } },
          task: { select: { taskNumber: true, title: true, internship: { select: { title: true } } } },
          enrollment: true
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { submissionDate: 'desc' }
      }),
      prisma.submission.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        submissions,
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

// Get submission by ID
const getSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        user: { select: { userId: true, name: true, email: true } },
        task: { include: { internship: { select: { title: true } } } },
        enrollment: true
      }
    });

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    res.json({ success: true, data: submission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Review submission (Admin)
const reviewSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { status, score, feedback } = req.body;
    const reviewerId = req.user.id;

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        task: true,
        enrollment: true,
        user: true
      }
    });

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status,
        score: status === 'APPROVED' ? (score || submission.task.points) : 0,
        adminFeedback: feedback,
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
        nextTaskUnlocked: status === 'APPROVED'
      }
    });

    if (status === 'APPROVED') {
      const currentTask = submission.task;
      const nextTaskNumber = currentTask.taskNumber + 1;

      await prisma.enrollment.update({
        where: { id: submission.enrollmentId },
        data: {
          currentUnlockedTask: nextTaskNumber
        }
      });

      const allSubmissions = await prisma.submission.findMany({
        where: {
          enrollmentId: submission.enrollmentId,
          status: 'APPROVED'
        }
      });

      const totalScore = allSubmissions.reduce((sum, s) => sum + (s.score || 0), 0);
      
      await prisma.enrollment.update({
        where: { id: submission.enrollmentId },
        data: { finalScore: totalScore }
      });

      const allTasks = await prisma.task.count({
        where: { internshipId: currentTask.internshipId, isActive: true }
      });

      if (currentTask.taskNumber >= allTasks) {
        await prisma.enrollment.update({
          where: { id: submission.enrollmentId },
          data: {
            isCompleted: true,
            completionDate: new Date()
          }
        });

        await prisma.notification.create({
          data: {
            userId: submission.userId,
            title: 'Internship Completed!',
            message: 'Congratulations! You have completed all tasks. You can now purchase your certificate.',
            type: 'SUCCESS'
          }
        });
      } else {
        await prisma.notification.create({
          data: {
            userId: submission.userId,
            title: 'Task Approved',
            message: `Your submission for ${currentTask.title} has been approved. Next task is now unlocked!`,
            type: 'SUCCESS'
          }
        });
      }
    } else if (status === 'REJECTED') {
      await prisma.resubmissionOpportunity.create({
        data: {
          originalSubmissionId: submissionId,
          enrollmentId: submission.enrollmentId,
          taskId: submission.taskId,
          allowedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      await prisma.notification.create({
        data: {
          userId: submission.userId,
          title: 'Task Needs Revision',
          message: `Your submission for ${submission.task.title} needs revision. Feedback: ${feedback}`,
          type: 'WARNING'
        }
      });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get intern submissions
const getInternSubmissions = async (req, res) => {
  try {
    const userId = req.user.id;

    const submissions = await prisma.submission.findMany({
      where: { userId },
      include: {
        task: { select: { taskNumber: true, title: true, points: true } }
      },
      orderBy: { submissionDate: 'desc' }
    });

    res.json({ success: true, data: submissions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  submitTask,
  getAllSubmissions,
  getSubmission,
  reviewSubmission,
  getInternSubmissions
};