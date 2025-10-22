// backend/prisma/seed.js - COMPLETE MERGED VERSION

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          🌱 STARTING DATABASE SEED                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // ============================================================================
  // CLEAR EXISTING DATA
  // ============================================================================
  
  console.log('🧹 Cleaning existing data...');
  try {
    await prisma.resubmissionOpportunity.deleteMany().catch(() => {});
    await prisma.taskUnlock.deleteMany().catch(() => {});
    await prisma.certificateValidation.deleteMany().catch(() => {});
    await prisma.certificateSession.deleteMany().catch(() => {});
    await prisma.privateTaskSubmission.deleteMany().catch(() => {});
    await prisma.privateTask.deleteMany().catch(() => {});
    await prisma.chatParticipant.deleteMany().catch(() => {});
    await prisma.messageRead.deleteMany().catch(() => {});
    await prisma.chatMessage.deleteMany().catch(() => {});
    await prisma.chatRoom.deleteMany().catch(() => {});
    await prisma.chatPermission.deleteMany().catch(() => {});
    await prisma.auditLog.deleteMany().catch(() => {});
    await prisma.notification.deleteMany().catch(() => {});
    await prisma.payment.deleteMany().catch(() => {});
    await prisma.submission.deleteMany().catch(() => {});
    await prisma.enrollment.deleteMany().catch(() => {});
    await prisma.task.deleteMany().catch(() => {});
    await prisma.courseMaterial.deleteMany().catch(() => {});
    await prisma.internship.deleteMany().catch(() => {});
    await prisma.paidTask.deleteMany().catch(() => {});
    await prisma.user.deleteMany().catch(() => {});
    
    console.log('✅ Cleared all collections\n');
  } catch (error) {
    console.log('⚠️  Some cleanup errors (normal on first run)\n');
  }

  // ============================================================================
  // CREATE ADMIN USER
  // ============================================================================
  
  console.log('👨‍💼 Creating admin user...');
  const admin = await prisma.user.create({
    data: {
      userId: 'ADMIN001',
      name: 'System Administrator',
      email: 'admin@lms.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'ADMIN',
      phone: '+919876543210',
      isActive: true
    }
  });
  console.log('✅ Admin: admin@lms.com / admin123\n');

  // ============================================================================
  // CREATE INTERN USERS
  // ============================================================================
  
  console.log('👨‍🎓 Creating intern users...');
  const mainIntern = await prisma.user.create({
    data: {
      userId: 'INT2025001',
      name: 'Intern User',
      email: 'intern@lms.com',
      passwordHash: await bcrypt.hash('int2025001', 10),
      role: 'INTERN',
      phone: '+919876543211',
      isActive: true
    }
  });
  console.log('✅ Main Intern: intern@lms.com / int2025001');

  const interns = [mainIntern];
  for (let i = 2; i <= 10; i++) {
    const userId = `INT2025${String(i).padStart(3, '0')}`;
    const password = `int2025${String(i).padStart(3, '0')}`;
    const intern = await prisma.user.create({
      data: {
        userId,
        name: `Intern ${i}`,
        email: `intern${i}@lms.com`,
        passwordHash: await bcrypt.hash(password, 10),
        role: 'INTERN',
        phone: `+9198765432${10 + i}`,
        isActive: true
      }
    });
    interns.push(intern);
  }
  console.log(`✅ Total ${interns.length} interns created\n`);

  // ============================================================================
  // CREATE INTERNSHIPS
  // ============================================================================
  
  console.log('📚 Creating internships...');
  
  const internship1 = await prisma.internship.create({
    data: {
      title: 'Full Stack Web Development',
      description: 'Master modern web development with React, Node.js, Express, and MongoDB. Build 35 real-world projects covering frontend, backend, databases, authentication, deployment, and more. Perfect for beginners to advanced developers.',
      durationDays: 35,
      isActive: true,
      price: 0,
      certificatePrice: 499,
      passPercentage: 75
    }
  });
  console.log('✅ Internship 1: Full Stack Web Development (35 days, 35 tasks)');

  const internship2 = await prisma.internship.create({
    data: {
      title: 'Mobile App Development with React Native',
      description: 'Learn to build cross-platform mobile applications using React Native. Create apps for both iOS and Android with a single codebase. Includes navigation, state management, API integration, and app store deployment.',
      durationDays: 30,
      isActive: true,
      price: 0,
      certificatePrice: 599,
      passPercentage: 75
    }
  });
  console.log('✅ Internship 2: Mobile App Development (30 days)');

  const internship3 = await prisma.internship.create({
    data: {
      title: 'Cloud & DevOps Engineering',
      description: 'Master cloud platforms (AWS, Azure, GCP) and DevOps tools (Docker, Kubernetes, Jenkins, Terraform). Learn CI/CD pipelines, infrastructure as code, monitoring, and cloud architecture best practices.',
      durationDays: 40,
      isActive: true,
      price: 0,
      certificatePrice: 699,
      passPercentage: 75
    }
  });
  console.log('✅ Internship 3: Cloud & DevOps Engineering (40 days)\n');

  // ============================================================================
  // CREATE COURSE MATERIALS
  // ============================================================================
  
  console.log('📄 Creating course materials...');
  const materials = [
    { title: 'Introduction to Web Development', materialType: 'VIDEO', fileUrl: '/materials/intro.mp4', sortOrder: 1 },
    { title: 'HTML & CSS Basics', materialType: 'PDF', fileUrl: '/materials/html-css.pdf', sortOrder: 2 },
    { title: 'JavaScript Fundamentals', materialType: 'VIDEO', fileUrl: '/materials/js-basics.mp4', sortOrder: 3 },
    { title: 'React Getting Started', materialType: 'PDF', fileUrl: '/materials/react-intro.pdf', sortOrder: 4 }
  ];

  for (const material of materials) {
    await prisma.courseMaterial.create({
      data: {
        ...material,
        internshipId: internship1.id,
        description: `Learn ${material.title}`,
        fileSize: 1024000
      }
    });
  }
  console.log('✅ Created 4 course materials\n');

  // ============================================================================
  // CREATE 35 TASKS FOR FULL STACK INTERNSHIP
  // ============================================================================
  
  console.log('📋 Creating tasks for Full Stack Internship...');
  const fullStackTasks = [
    'Setup Development Environment', 'HTML Document Structure', 'CSS Styling Basics', 'JavaScript Fundamentals',
    'DOM Manipulation', 'ES6 Features', 'Async JavaScript & Promises', 'Fetch API & AJAX', 'React Basics',
    'React Components & Props', 'React Hooks (useState, useEffect)', 'State Management', 'React Router', 'Form Handling',
    'API Integration', 'Node.js Introduction', 'Express Server Setup', 'RESTful APIs', 'MongoDB Setup',
    'CRUD Operations', 'User Authentication', 'JWT Implementation', 'File Upload System', 'Error Handling',
    'Testing with Jest', 'Unit Testing', 'Integration Testing', 'Deployment on Vercel', 'Docker Basics',
    'CI/CD Pipeline', 'Git Workflow', 'Code Review Process', 'Performance Optimization', 'Security Best Practices',
    'Final Capstone Project'
  ];

  const tasks1 = [];
  for (let i = 0; i < 35; i++) {
    const task = await prisma.task.create({
      data: {
        internshipId: internship1.id,
        taskNumber: i + 1,
        title: fullStackTasks[i],
        description: `Complete ${fullStackTasks[i]} task. Submit your GitHub repository link with proper documentation and README file. Ensure clean code and best practices.`,
        points: 10,
        submissionType: i % 3 === 0 ? 'GITHUB' : i % 3 === 1 ? 'FORM' : 'FILE',
        videoUrl: i % 5 === 0 ? 'https://www.youtube.com/watch?v=example' : null,
        files: i % 10 === 0 ? [{ name: 'reference.pdf', url: '/uploads/reference.pdf' }] : null,
        isActive: true,
        isRequired: true,
        waitTimeHours: 24,
        maxAttempts: 3
      }
    });
    tasks1.push(task);
  }
  console.log('✅ Created 35 tasks for Full Stack Internship');

  // ============================================================================
  // CREATE TASKS FOR MOBILE APP INTERNSHIP
  // ============================================================================
  
  console.log('📋 Creating tasks for Mobile App Internship...');
  const mobileTasks = [
    'React Native Setup', 'Core Components', 'Flexbox Layouts', 'Navigation Setup',
    'State Management', 'API Integration', 'Authentication Flow', 'AsyncStorage',
    'Camera & Gallery', 'Push Notifications', 'Maps Integration', 'Performance Optimization',
    'Testing', 'App Store Deployment'
  ];

  const tasks2 = [];
  for (let i = 0; i < mobileTasks.length; i++) {
    const task = await prisma.task.create({
      data: {
        internshipId: internship2.id,
        taskNumber: i + 1,
        title: mobileTasks[i],
        description: `Complete ${mobileTasks[i]} for mobile development. Submit GitHub repository with APK file or iOS build.`,
        points: 10,
        submissionType: 'GITHUB',
        isActive: true,
        isRequired: true,
        waitTimeHours: 24,
        maxAttempts: 3
      }
    });
    tasks2.push(task);
  }
  console.log('✅ Created 14 tasks for Mobile App Internship');

  // ============================================================================
  // CREATE TASKS FOR CLOUD & DEVOPS INTERNSHIP
  // ============================================================================
  
  console.log('📋 Creating tasks for Cloud & DevOps Internship...');
  const cloudTasks = [
    'AWS Account Setup', 'EC2 Instance Creation', 'S3 Bucket Management', 'Docker Basics',
    'Dockerfile Creation', 'Docker Compose', 'Kubernetes Basics', 'CI/CD with Jenkins',
    'Terraform Introduction', 'Infrastructure as Code', 'Monitoring with CloudWatch', 'Final Cloud Project'
  ];

  const tasks3 = [];
  for (let i = 0; i < cloudTasks.length; i++) {
    const task = await prisma.task.create({
      data: {
        internshipId: internship3.id,
        taskNumber: i + 1,
        title: cloudTasks[i],
        description: `Complete ${cloudTasks[i]} task. Document your infrastructure setup and configurations.`,
        points: 10,
        submissionType: 'GITHUB',
        isActive: true,
        isRequired: true,
        waitTimeHours: 24,
        maxAttempts: 3
      }
    });
    tasks3.push(task);
  }
  console.log('✅ Created 12 tasks for Cloud & DevOps Internship\n');

  // ============================================================================
  // CREATE PAID TASKS
  // ============================================================================
  
  console.log('💰 Creating paid tasks...');
  const paidTasks = [
    { title: 'Advanced React Patterns', description: 'Master advanced React patterns including HOC, Render Props, Compound Components, and Custom Hooks.', price: 1000 },
    { title: 'Microservices Architecture', description: 'Build scalable microservices with Docker, Kubernetes, and API Gateway.', price: 1500 },
    { title: 'AWS Full Stack Deployment', description: 'Deploy complete MERN stack application on AWS with load balancing and auto-scaling.', price: 2000 }
  ];

  for (const task of paidTasks) {
    await prisma.paidTask.create({
      data: {
        ...task,
        isActive: true
      }
    });
  }
  console.log('✅ Created 3 paid tasks (₹1000, ₹1500, ₹2000)\n');

  // ============================================================================
  // CREATE ENROLLMENTS WITH SAMPLE DATA
  // ============================================================================
  
  console.log('📝 Creating enrollments and sample progress...');

  // Intern 1 - Active in Full Stack (5 tasks completed)
  const enrollment1 = await prisma.enrollment.create({
    data: {
      userId: interns[0].id,
      internshipId: internship1.id,
      currentUnlockedTask: 6,
      status: 'ACTIVE',
      enrollmentDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    }
  });

  for (let j = 0; j < 5; j++) {
    await prisma.submission.create({
      data: {
        enrollmentId: enrollment1.id,
        taskId: tasks1[j].id,
        userId: interns[0].id,
        submissionType: 'GITHUB',
        githubUrl: `https://github.com/intern1/task-${j + 1}`,
        status: 'APPROVED',
        score: 10,
        adminFeedback: 'Excellent work! Well documented and clean code.',
        reviewedAt: new Date(Date.now() - (5 - j) * 24 * 60 * 60 * 1000),
        reviewedBy: admin.id,
        nextTaskUnlocked: true
      }
    });
  }

  await prisma.submission.create({
    data: {
      enrollmentId: enrollment1.id,
      taskId: tasks1[5].id,
      userId: interns[0].id,
      submissionType: 'GITHUB',
      githubUrl: 'https://github.com/intern1/task-6',
      status: 'PENDING',
      nextTaskUnlocked: false
    }
  });
  console.log('✅ Intern 1: Enrolled in Full Stack (5 tasks approved, 1 pending)');

  // Intern 2 - Active in Full Stack (2 tasks completed)
  const enrollment2 = await prisma.enrollment.create({
    data: {
      userId: interns[1].id,
      internshipId: internship1.id,
      currentUnlockedTask: 3,
      status: 'ACTIVE',
      enrollmentDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    }
  });

  for (let j = 0; j < 2; j++) {
    await prisma.submission.create({
      data: {
        enrollmentId: enrollment2.id,
        taskId: tasks1[j].id,
        userId: interns[1].id,
        submissionType: 'GITHUB',
        githubUrl: `https://github.com/intern2/task-${j + 1}`,
        status: 'APPROVED',
        score: 9,
        adminFeedback: 'Good work!',
        reviewedAt: new Date(Date.now() - (3 - j) * 24 * 60 * 60 * 1000),
        reviewedBy: admin.id,
        nextTaskUnlocked: true
      }
    });
  }
  console.log('✅ Intern 2: Enrolled in Full Stack (2 tasks approved)');

  // Intern 3 - Just started Full Stack
  const enrollment3 = await prisma.enrollment.create({
    data: {
      userId: interns[2].id,
      internshipId: internship1.id,
      currentUnlockedTask: 1,
      status: 'ACTIVE',
      enrollmentDate: new Date()
    }
  });
  console.log('✅ Intern 3: Just enrolled in Full Stack (0 tasks completed)');

  // Intern 4 - Active in Mobile App
  const enrollment4 = await prisma.enrollment.create({
    data: {
      userId: interns[3].id,
      internshipId: internship2.id,
      currentUnlockedTask: 1,
      status: 'ACTIVE',
      enrollmentDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    }
  });
  console.log('✅ Intern 4: Enrolled in Mobile App Development');

  // Intern 5 - Completed Full Stack
  const enrollment5 = await prisma.enrollment.create({
    data: {
      userId: interns[4].id,
      internshipId: internship1.id,
      currentUnlockedTask: 35,
      status: 'COMPLETED',
      isCompleted: true,
      finalScore: 320,
      completionDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      enrollmentDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
    }
  });
  console.log('✅ Intern 5: COMPLETED Full Stack (eligible for certificate)');

  // Intern 6 - UNENROLLED from Cloud & DevOps
  const enrollment6 = await prisma.enrollment.create({
    data: {
      userId: interns[5].id,
      internshipId: internship3.id,
      currentUnlockedTask: 1,
      status: 'UNENROLLED',
      unenrollmentDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      enrollmentDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    }
  });
  console.log('✅ Intern 6: UNENROLLED from Cloud & DevOps (demo)\n');

  // ============================================================================
  // CREATE NOTIFICATIONS
  // ============================================================================
  
  console.log('🔔 Creating notifications...');
  const notifications = [
    { userId: interns[0].id, title: 'Welcome to LMS!', message: 'You have been enrolled in Full Stack Web Development. Start your first task now!', type: 'SUCCESS' },
    { userId: interns[0].id, title: 'Task Approved ✅', message: 'Your submission for Task 1 has been approved! Score: 10/10', type: 'SUCCESS' },
    { userId: interns[0].id, title: 'New Task Unlocked 🔓', message: 'Task 6 is now available. Complete it within 24 hours!', type: 'INFO' },
    { userId: interns[1].id, title: 'Welcome to LMS!', message: 'You have been enrolled in Full Stack Web Development.', type: 'SUCCESS' },
    { userId: interns[4].id, title: 'Congratulations! 🎉', message: 'You have completed the Full Stack Web Development internship. Purchase your certificate now!', type: 'SUCCESS' }
  ];

  for (const notif of notifications) {
    await prisma.notification.create({ data: notif });
  }
  console.log('✅ Created 5 notifications\n');

  // ============================================================================
  // CREATE SAMPLE PAYMENTS
  // ============================================================================
  
  console.log('💳 Creating sample payments...');

  // Certificate payment - PENDING
  await prisma.payment.create({
    data: {
      userId: interns[4].id,
      internshipId: internship1.id,
      amount: 499,
      paymentType: 'CERTIFICATE',
      paymentStatus: 'PENDING',
      paymentProofUrl: '/uploads/payment-proof-1.jpg',
      transactionId: 'TXN' + Date.now()
    }
  });
  console.log('✅ Payment 1: Certificate purchase (PENDING)');

  // Paid task payment - VERIFIED
  const firstPaidTask = await prisma.paidTask.findFirst();
  if (firstPaidTask) {
    await prisma.payment.create({
      data: {
        userId: interns[1].id,
        paidTaskId: firstPaidTask.id,
        amount: 1000,
        paymentType: 'PAID_TASK',
        paymentStatus: 'VERIFIED',
        paymentProofUrl: '/uploads/payment-proof-2.jpg',
        transactionId: 'TXN' + (Date.now() - 100000),
        verifiedTransactionId: 'VTXN' + Date.now(),
        verifiedAt: new Date()
      }
    });
    console.log('✅ Payment 2: Paid task (VERIFIED)\n');
  }

  // ============================================================================
  // CREATE CHAT PERMISSIONS
  // ============================================================================
  
  console.log('💬 Creating chat permissions...');
  await prisma.chatPermission.create({
    data: {
      userId: interns[0].id,
      isEnabled: true,
      enabledAt: new Date(),
      enabledBy: admin.id
    }
  });
  console.log('✅ Chat enabled for Intern 1\n');

  // ============================================================================
  // CREATE PRIVATE TASK
  // ============================================================================
  
  console.log('📌 Creating private task...');
  await prisma.privateTask.create({
    data: {
      assignedToUserId: interns[0].id,
      assignedByUserId: admin.id,
      title: 'Code Review: E-commerce Project',
      description: 'Review the e-commerce project and provide detailed feedback on code quality, architecture, and best practices.',
      instructions: 'Focus on: 1) Code structure, 2) Security issues, 3) Performance optimizations, 4) Documentation',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      points: 100,
      status: 'ASSIGNED',
      isCompleted: false
    }
  });
  console.log('✅ Private task assigned to Intern 1\n');

  // ============================================================================
  // CREATE AUDIT LOGS
  // ============================================================================
  
  console.log('📊 Creating audit logs...');
  await prisma.auditLog.create({
    data: {
      action: 'SYSTEM_SEED',
      userId: admin.id,
      details: 'Database seeded with complete LMS data - Full Stack, Mobile, Cloud internships with unenroll feature',
      ipAddress: '127.0.0.1'
    }
  });
  console.log('✅ Audit logs created\n');

  // ============================================================================
  // SUMMARY
  // ============================================================================
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          ✅ DATABASE SEED COMPLETED SUCCESSFULLY!         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('📊 SUMMARY:');
  console.log('  👨‍💼 Admins: 1');
  console.log('  👨‍🎓 Interns: 10');
  console.log('  📚 Internships: 3');
  console.log('  📋 Tasks: 61 total');
  console.log('     • Full Stack: 35 tasks');
  console.log('     • Mobile App: 14 tasks');
  console.log('     • Cloud/DevOps: 12 tasks');
  console.log('  💰 Paid Tasks: 3');
  console.log('  📝 Enrollments: 6 (4 active, 1 completed, 1 unenrolled)');
  console.log('  ✉️ Submissions: 8');
  console.log('  💳 Payments: 2');
  console.log('  🔔 Notifications: 5');
  console.log('  📄 Course Materials: 4\n');
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                   🔑 LOGIN CREDENTIALS                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('👨‍💼 ADMIN LOGIN:');
  console.log('   Email:    admin@lms.com');
  console.log('   Password: admin123\n');
  
  console.log('👨‍🎓 MAIN INTERN LOGIN:');
  console.log('   Email:    intern@lms.com');
  console.log('   Password: int2025001\n');
  
  console.log('👨‍🎓 ADDITIONAL INTERNS (Testing):');
  for (let i = 2; i <= 10; i++) {
    console.log(`   Email: intern${i}@lms.com | Password: int2025${String(i).padStart(3, '0')}`);
  }
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                   📚 INTERNSHIPS CREATED                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('   1. Full Stack Web Development (35 days, 35 tasks, ₹499)');
  console.log('   2. Mobile App Development (30 days, 14 tasks, ₹599)');
  console.log('   3. Cloud & DevOps Engineering (40 days, 12 tasks, ₹699)\n');
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                   ✨ FEATURES INCLUDED                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('   ✓ Enrollment Status (ACTIVE, UNENROLLED, COMPLETED)');
  console.log('   ✓ Unenroll functionality with date tracking');
  console.log('   ✓ Cascade delete for internships and enrollments');
  console.log('   ✓ Task submission with GitHub/Form/File types');
  console.log('   ✓ Certificate purchase workflow');
  console.log('   ✓ Paid tasks system');
  console.log('   ✓ Chat permissions');
  console.log('   ✓ Private tasks');
  console.log('   ✓ Notifications system');
  console.log('   ✓ Audit logs\n');
  
  console.log('🚀 Your LMS is ready to use!\n');
}

main()
  .catch((e) => {
    console.error('\n❌ SEEDING ERROR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });