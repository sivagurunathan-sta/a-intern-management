// backend/server.js - COMPLETE MERGED VERSION

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fileUpload = require('express-fileupload'); // ← CRITICAL: INSTALL THIS

dotenv.config();

const app = express();

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔥 CRITICAL: FILE UPLOAD MIDDLEWARE (This fixes your 400 Bad Request error!)
app.use(fileUpload({
  createParentPath: true,
  limits: { 
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  },
  abortOnLimit: true,
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// ROUTE IMPORTS
// ==========================================
const authRoutes = require('./src/routes/auth.routes');
const adminRoutes = require('./src/routes/admin.routes');
const internRoutes = require('./src/routes/intern.routes');
const internshipRoutes = require('./src/routes/internship.routes');
const taskRoutes = require('./src/routes/task.routes');
const submissionRoutes = require('./src/routes/submission.routes');
const paymentRoutes = require('./src/routes/payment.routes');
const certificateRoutes = require('./src/routes/certificate.routes');
const analyticsRoutes = require('./src/routes/analytics.routes');

// ==========================================
// ROUTE REGISTRATION
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/intern', internRoutes);
app.use('/api/internships', internshipRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/admin/analytics', analyticsRoutes);

// ==========================================
// ROOT & HEALTH CHECK
// ==========================================
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'Student LMS API is running',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      admin: '/api/admin',
      intern: '/api/intern',
      internships: '/api/internships',
      tasks: '/api/tasks',
      submissions: '/api/submissions',
      payments: '/api/payments',
      certificates: '/api/certificates',
      analytics: '/api/admin/analytics'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ==========================================
// API DOCUMENTATION
// ==========================================
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    message: 'Student LMS API Documentation',
    version: '1.0.0',
    baseUrl: 'http://localhost:5000/api',
    fileUpload: {
      description: 'File Upload Configuration',
      maxFileSize: '50MB',
      supportedEndpoints: [
        '/api/submissions',
        '/api/certificates'
      ]
    },
    analytics: {
      description: 'Analytics Dashboard API',
      endpoints: [
        {
          method: 'GET',
          path: '/admin/analytics/dashboard',
          description: 'Get comprehensive dashboard statistics',
          auth: 'Required (Admin)',
          response: {
            totalInterns: 'number',
            activeInterns: 'number',
            completedEnrollments: 'number',
            pendingSubmissions: 'number',
            verifiedPayments: 'number',
            totalRevenue: 'number',
            certificatesIssued: 'number',
            averageScore: 'number'
          }
        },
        {
          method: 'GET',
          path: '/admin/analytics/submissions',
          description: 'Get submission analytics data',
          auth: 'Required (Admin)',
          response: {
            total: 'number',
            byStatus: 'object',
            byInternship: 'object',
            weeklyTrend: 'array'
          }
        },
        {
          method: 'GET',
          path: '/admin/analytics/payments',
          description: 'Get payment analytics data',
          auth: 'Required (Admin)',
          response: {
            total: 'number',
            byStatus: 'object',
            byType: 'object',
            totalRevenue: 'number',
            monthlyRevenue: 'array'
          }
        },
        {
          method: 'GET',
          path: '/admin/analytics/certificates',
          description: 'Get certificate analytics data',
          auth: 'Required (Admin)',
          response: {
            total: 'number',
            issued: 'number',
            eligible: 'number',
            notEligible: 'number',
            issueRate: 'string',
            salesTrend: 'array'
          }
        },
        {
          method: 'GET',
          path: '/admin/analytics/internships',
          description: 'Get internship performance data',
          auth: 'Required (Admin)',
          response: {
            total: 'number',
            performance: 'array',
            topPerforming: 'array',
            leastPerforming: 'array'
          }
        },
        {
          method: 'GET',
          path: '/admin/analytics/users',
          description: 'Get user analytics data',
          auth: 'Required (Admin)',
          response: {
            totalInterns: 'number',
            activeInterns: 'number',
            inactiveInterns: 'number',
            totalAdmins: 'number',
            topPerformers: 'array'
          }
        },
        {
          method: 'GET',
          path: '/admin/analytics/export',
          description: 'Export all analytics data as JSON',
          auth: 'Required (Admin)',
          response: 'array of all users with complete data'
        }
      ]
    }
  });
});

// ==========================================
// 404 ERROR HANDLING
// ==========================================
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    hint: 'Visit /api/docs for documentation'
  });
});

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================
app.use((error, req, res, next) => {
  console.error('❌ Error:', error);
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// ==========================================
// START SERVER
// ==========================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║          🎓 STUDENT LMS SERVER STARTED                    ║
╚════════════════════════════════════════════════════════════╝

🚀 Server Running on Port: ${PORT}
📍 Base URL: http://localhost:${PORT}

📡 API ENDPOINTS:
   ├─ 🔐 Auth:        http://localhost:${PORT}/api/auth
   ├─ 👨‍💼 Admin:        http://localhost:${PORT}/api/admin
   ├─ 👨‍🎓 Intern:       http://localhost:${PORT}/api/intern
   ├─ 📚 Internships:  http://localhost:${PORT}/api/internships
   ├─ 📋 Tasks:        http://localhost:${PORT}/api/tasks
   ├─ 📝 Submissions:  http://localhost:${PORT}/api/submissions
   ├─ 💰 Payments:     http://localhost:${PORT}/api/payments
   ├─ 🎓 Certificates: http://localhost:${PORT}/api/certificates
   └─ 📊 Analytics:    http://localhost:${PORT}/api/admin/analytics

📚 Documentation:
   • Full API Docs: http://localhost:${PORT}/api/docs
   • Health Check:  http://localhost:${PORT}/api/health

🔗 ANALYTICS DASHBOARD ENDPOINTS:
   • Dashboard:     GET /api/admin/analytics/dashboard
   • Submissions:   GET /api/admin/analytics/submissions
   • Payments:      GET /api/admin/analytics/payments
   • Certificates:  GET /api/admin/analytics/certificates
   • Internships:   GET /api/admin/analytics/internships
   • Users:         GET /api/admin/analytics/users
   • Export:        GET /api/admin/analytics/export

📤 FILE UPLOAD:
   • Enabled: YES
   • Max Size: 50MB
   • Supported: /api/submissions, /api/certificates

💡 Test Admin Login:
   Email: admin@lms.com
   Password: admin123

⚙️  Environment: ${process.env.NODE_ENV || 'development'}
📦 Database: MongoDB

════════════════════════════════════════════════════════════
  `);
});

module.exports = app;