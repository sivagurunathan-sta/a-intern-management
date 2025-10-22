// backend/src/controllers/task.controller.js - FIXED WITH PROPER TYPE CONVERSION
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');
const prisma = new PrismaClient();

// ============================================================
// CREATE TASK - Main Function
// ============================================================
const createTask = async (req, res) => {
  try {
    console.log('='.repeat(60));
    console.log('📝 CREATING TASK');
    console.log('='.repeat(60));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Files:', req.files ? Object.keys(req.files) : 'none');

    // Extract and clean all data from request
    let internshipId = req.body.internshipId;
    let taskNumber = req.body.taskNumber;
    let title = req.body.title;
    let description = req.body.description;
    let videoUrl = req.body.videoUrl || '';
    let points = req.body.points || '10';
    let submissionType = req.body.submissionType || 'GITHUB';
    let isRequired = req.body.isRequired;
    let waitTimeHours = req.body.waitTimeHours || '12';
    let maxAttempts = req.body.maxAttempts || '3';

    // Convert types properly
    taskNumber = parseInt(taskNumber);
    points = parseInt(points);
    waitTimeHours = parseInt(waitTimeHours);
    maxAttempts = parseInt(maxAttempts);
    
    // Convert boolean string to actual boolean
    if (typeof isRequired === 'string') {
      isRequired = isRequired === 'true' || isRequired === true;
    }
    if (isRequired === undefined || isRequired === null) {
      isRequired = true;
    }

    console.log('Cleaned data:', {
      internshipId,
      taskNumber: typeof taskNumber,
      title: title ? 'EXISTS' : 'MISSING',
      description: description ? 'EXISTS' : 'MISSING',
      isRequired: typeof isRequired,
      points: typeof points,
      submissionType
    });

    // Validate required fields
    if (!internshipId) {
      console.log('❌ Missing: internshipId');
      return res.status(400).json({ 
        success: false, 
        message: 'Internship ID is required. Please select an internship first.' 
      });
    }

    if (!taskNumber || isNaN(taskNumber)) {
      console.log('❌ Missing or invalid: taskNumber');
      return res.status(400).json({ 
        success: false, 
        message: 'Task number is required and must be a number' 
      });
    }

    if (!title) {
      console.log('❌ Missing: title');
      return res.status(400).json({ 
        success: false, 
        message: 'Title is required. Please enter a task title.' 
      });
    }

    if (!description) {
      console.log('❌ Missing: description');
      return res.status(400).json({ 
        success: false, 
        message: 'Description is required. Please enter a task description.' 
      });
    }

    console.log('✅ All validations passed');

    // Check if internship exists
    const internship = await prisma.internship.findUnique({
      where: { id: internshipId }
    });

    if (!internship) {
      console.log('❌ Internship not found');
      return res.status(404).json({ 
        success: false, 
        message: 'Internship not found' 
      });
    }

    console.log('✅ Internship found:', internship.title);

    let files = [];
    let videoPath = null;

    // Handle file uploads if present
    if (req.files) {
      const uploadDir = path.join(__dirname, '../../uploads/tasks');
      
      // Create upload directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Handle video file upload
      if (req.files.video) {
        const videoFile = req.files.video;
        const videoFileName = `${Date.now()}_video_${videoFile.name.replace(/\s+/g, '_')}`;
        videoPath = `/uploads/tasks/${videoFileName}`;
        await videoFile.mv(path.join(uploadDir, videoFileName));
        console.log('✅ Video uploaded:', videoPath);
      }

      // Handle document files upload
      const fileKeys = Object.keys(req.files).filter(key => key !== 'video');
      
      for (const key of fileKeys) {
        const file = req.files[key];
        const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const filePath = `/uploads/tasks/${fileName}`;
        
        await file.mv(path.join(uploadDir, fileName));
        
        files.push({ 
          name: file.name, 
          url: filePath, 
          size: file.size,
          type: file.mimetype
        });
        
        console.log('✅ Document uploaded:', filePath);
      }
    }

    // Create the task in database
    const task = await prisma.task.create({
      data: {
        internshipId,
        taskNumber: taskNumber,
        title: title.trim(),
        description: description.trim(),
        videoUrl: videoPath || (videoUrl ? videoUrl : null),
        files: files.length > 0 ? files : null,
        points: points,
        submissionType,
        isRequired: isRequired,
        waitTimeHours: waitTimeHours,
        maxAttempts: maxAttempts,
        isActive: true
      }
    });

    console.log('='.repeat(60));
    console.log('✅ TASK CREATED SUCCESSFULLY');
    console.log('Task ID:', task.id);
    console.log('Task Number:', task.taskNumber);
    console.log('Title:', task.title);
    console.log('='.repeat(60));

    res.json({ 
      success: true, 
      message: 'Task created successfully!',
      data: task 
    });

  } catch (error) {
    console.log('='.repeat(60));
    console.error('❌ ERROR CREATING TASK');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.log('='.repeat(60));
    
    res.status(500).json({ 
      success: false, 
      message: error.message
    });
  }
};

// ============================================================
// GET TASKS FOR INTERN - With unlock status
// ============================================================
const getTasksForIntern = async (req, res) => {
  try {
    const { internshipId } = req.params;
    const userId = req.user.id;

    // Check if intern is enrolled in this internship
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_internshipId: { userId, internshipId } }
    });

    if (!enrollment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Not enrolled in this internship' 
      });
    }

    // Get all tasks for this internship with intern's submissions
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

    // Add unlock status and submission info to each task
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
    console.error('Error fetching tasks for intern:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// GET SINGLE TASK - By ID
// ============================================================
const getTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        internship: {
          select: { 
            id: true, 
            title: true 
          }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ 
        success: false, 
        message: 'Task not found' 
      });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// UPDATE TASK - FIXED WITH PROPER TYPE CONVERSION
// ============================================================
const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    
    console.log('='.repeat(60));
    console.log('📝 Updating task:', taskId);
    console.log('Raw Updates:', req.body);
    console.log('Files:', req.files ? Object.keys(req.files) : 'none');

    // Check if task exists
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!existingTask) {
      return res.status(404).json({ 
        success: false, 
        message: 'Task not found' 
      });
    }

    console.log('✅ Task found');

    // Extract and convert all fields with proper types
    let updates = {
      taskNumber: req.body.taskNumber ? parseInt(req.body.taskNumber) : existingTask.taskNumber,
      title: req.body.title || existingTask.title,
      description: req.body.description || existingTask.description,
      videoUrl: req.body.videoUrl || existingTask.videoUrl,
      points: req.body.points ? parseInt(req.body.points) : existingTask.points,
      submissionType: req.body.submissionType || existingTask.submissionType,
      isRequired: req.body.isRequired !== undefined ? (req.body.isRequired === 'true' || req.body.isRequired === true) : existingTask.isRequired,
      waitTimeHours: req.body.waitTimeHours ? parseInt(req.body.waitTimeHours) : existingTask.waitTimeHours,
      maxAttempts: req.body.maxAttempts ? parseInt(req.body.maxAttempts) : existingTask.maxAttempts
    };

    console.log('Converted Updates:', {
      taskNumber: typeof updates.taskNumber,
      title: typeof updates.title,
      points: typeof updates.points,
      isRequired: typeof updates.isRequired,
      waitTimeHours: typeof updates.waitTimeHours,
      maxAttempts: typeof updates.maxAttempts
    });

    // Handle file uploads if present
    if (req.files) {
      const uploadDir = path.join(__dirname, '../../uploads/tasks');
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Handle video update
      if (req.files.video) {
        const videoFile = req.files.video;
        const videoFileName = `${Date.now()}_video_${videoFile.name.replace(/\s+/g, '_')}`;
        updates.videoUrl = `/uploads/tasks/${videoFileName}`;
        await videoFile.mv(path.join(uploadDir, videoFileName));
        console.log('✅ Video updated:', updates.videoUrl);
      }

      // Handle document updates
      const fileKeys = Object.keys(req.files).filter(key => key !== 'video');
      
      if (fileKeys.length > 0) {
        let files = [];
        
        for (const key of fileKeys) {
          const file = req.files[key];
          const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
          const filePath = `/uploads/tasks/${fileName}`;
          
          await file.mv(path.join(uploadDir, fileName));
          
          files.push({ 
            name: file.name, 
            url: filePath, 
            size: file.size,
            type: file.mimetype
          });
        }
        
        updates.files = files;
        console.log('✅ Documents updated');
      }
    }

    console.log('Final updates object:', updates);

    // Update the task
    const task = await prisma.task.update({
      where: { id: taskId },
      data: updates
    });

    console.log('='.repeat(60));
    console.log('✅ TASK UPDATED SUCCESSFULLY');
    console.log('='.repeat(60));

    res.json({ 
      success: true, 
      message: 'Task updated successfully!',
      data: task 
    });
  } catch (error) {
    console.log('='.repeat(60));
    console.error('❌ ERROR UPDATING TASK');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.log('='.repeat(60));
    
    res.status(500).json({ 
      success: false, 
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// ============================================================
// DELETE TASK - Soft delete (sets isActive to false)
// ============================================================
const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    // Check if task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return res.status(404).json({ 
        success: false, 
        message: 'Task not found' 
      });
    }

    await prisma.task.update({
      where: { id: taskId },
      data: { isActive: false }
    });

    console.log('✅ Task deleted (soft delete):', taskId);

    res.json({ 
      success: true, 
      message: 'Task deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ============================================================
// GET ALL TASKS FOR INTERNSHIP - Admin view
// ============================================================
const getAllTasksForInternship = async (req, res) => {
  try {
    const { internshipId } = req.params;

    const tasks = await prisma.task.findMany({
      where: { 
        internshipId, 
        isActive: true 
      },
      orderBy: { taskNumber: 'asc' },
      include: {
        _count: {
          select: {
            submissions: true
          }
        }
      }
    });

    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Error fetching tasks for internship:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ============================================================
// EXPORTS
// ============================================================
module.exports = {
  createTask,
  getTasksForIntern,
  getTask,
  updateTask,
  deleteTask,
  getAllTasksForInternship
};