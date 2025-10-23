// backend/src/controllers/submission.controller.js - FIXED

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

    // ✅ FIX: Check if submission already exists
    const existingSubmission = await prisma.submission.findFirst({
      where: {
        enrollmentId: enrollment.id,
        taskId,
        userId
      }
    });

    // ✅ FIX: If exists and is REJECTED, allow resubmission. Otherwise, don't allow duplicate
    if (existingSubmission && existingSubmission.status !== 'REJECTED') {
      return res.status(400).json({ 
        success: false, 
        message: `Task already submitted with status: ${existingSubmission.status}. You can only resubmit rejected tasks.` 
      });
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

    let submission;
    
    // ✅ FIX: If resubmitting rejected task, update instead of create
    if (existingSubmission && existingSubmission.status === 'REJECTED') {
      submission = await prisma.submission.update({
        where: { id: existingSubmission.id },
        data: {
          submissionType: task.submissionType,
          githubUrl: githubUrl || existingSubmission.githubUrl,
          formData: formData || existingSubmission.formData,
          fileUrl: fileUrl || existingSubmission.fileUrl,
          status: 'PENDING',
          submissionDate: new Date(),
          reviewedAt: null,
          adminFeedback: null
        }
      });
    } else {
      // ✅ NEW SUBMISSION
      submission = await prisma.submission.create({
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
    }

    const waitTime = new Date(Date.now() + task.waitTimeHours * 60 * 60 * 1000);
    
    // ✅ FIX: Check if TaskUnlock exists before creating
    const existingUnlock = await prisma.taskUnlock.findFirst({
      where: {
        enrollmentId: enrollment.id,
        taskId
      }
    });

    if (!existingUnlock) {
      await prisma.taskUnlock.create({
        data: {
          enrollmentId: enrollment.id,
          taskId,
          unlocksAt: waitTime,
          isUnlocked: false
        }
      });
    }

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
    console.error('Submit task error:', error);
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

// ✅ FIXED: Review submission with proper completion detection
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

      // ✅ FIXED: Calculate total score from all approved submissions
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

      // ✅ FIXED: Get actual task count for THIS internship
      const allTasks = await prisma.task.count({
        where: { internshipId: currentTask.internshipId, isActive: true }
      });

      const approvedCount = allSubmissions.length;

      console.log('Completion Check:', {
        internshipId: currentTask.internshipId,
        totalTasks: allTasks,
        approvedTasks: approvedCount,
        currentTaskNumber: currentTask.taskNumber,
        isComplete: approvedCount >= allTasks
      });

      // ✅ FIXED: Check if ALL tasks are completed (not just task number)
      if (approvedCount >= allTasks) {
        // ✅ FIXED: Calculate percentage based on actual tasks
        const maxPossibleScore = allTasks * 10; // Each task worth 10 points
        const percentage = Math.round((totalScore / maxPossibleScore) * 100);
        
        // Get pass percentage for this internship
        const enrollmentData = await prisma.enrollment.findUnique({
          where: { id: submission.enrollmentId },
          include: { internship: true }
        });
        
        const passPercentage = enrollmentData.internship.passPercentage || 75;
        const passed = percentage >= passPercentage;

        console.log('Marking as completed:', {
          totalScore,
          maxPossibleScore,
          percentage,
          passPercentage,
          passed
        });

        await prisma.enrollment.update({
          where: { id: submission.enrollmentId },
          data: {
            isCompleted: true,
            completionDate: new Date(),
            status: 'COMPLETED'
          }
        });

        // ✅ FIXED: Send appropriate notification based on pass/fail
        await prisma.notification.create({
          data: {
            userId: submission.userId,
            title: passed ? '🎉 Internship Completed!' : '📊 Internship Completed',
            message: passed 
              ? `Congratulations! You've completed all tasks with ${percentage}% (${totalScore}/${maxPossibleScore} points). You can now purchase your certificate!`
              : `You've completed all tasks with ${percentage}% (${totalScore}/${maxPossibleScore} points). You need ${passPercentage}% to get the certificate.`,
            type: passed ? 'SUCCESS' : 'INFO'
          }
        });
      } else {
        // Still tasks remaining - send normal approval notification
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
    console.error('Review submission error:', error);
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