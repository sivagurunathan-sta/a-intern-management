// backend/src/routes/admin.routes.js - UPDATED
const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly } = require('../middleware/auth.middleware');
const {
  getAllUsers,
  bulkAddUsers,
  updateUser,
  revokeAccess,
  restoreAccess,
  getDashboardStats,
  getUserDetails,
  getUserHistory,
  enableChat,
  disableChat
} = require('../controllers/admin.controller');

router.use(authMiddleware, adminOnly);

// User Management Routes
router.get('/users', getAllUsers);
router.get('/users/:userId/details', getUserDetails);
router.get('/users/:userId/history', getUserHistory);
router.post('/users/bulk-add', bulkAddUsers);
router.put('/users/:userId', updateUser);
router.post('/users/:userId/revoke', revokeAccess);
router.post('/users/:userId/restore', restoreAccess);
router.post('/users/:userId/enable-chat', enableChat);
router.post('/users/:userId/disable-chat', disableChat);
router.get('/dashboard/stats', getDashboardStats);

module.exports = router;