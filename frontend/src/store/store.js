/**
 * ============================================================================
 * REDUX STORE - frontend/src/store/store.js (FIXED)
 * ============================================================================
 */

import { configureStore } from '@reduxjs/toolkit';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { 
  authAPI, 
  adminUserAPI, 
  adminPaymentAPI, 
  adminTaskAPI,
  internDashboardAPI,
  internCourseAPI,
  internSubmissionAPI,
  internCertificateAPI
} from '../services/api';

// ==================== AUTH SLICE ====================

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials.email, credentials.password);
      if (response.success && response.data) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        return { token, user };
      }
      throw new Error(response.message || 'Login failed');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await authAPI.register(userData.name, userData.email, userData.password);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authAPI.getProfile();
      if (response.success) {
        return response.data?.user || response.data;
      }
      throw new Error('Failed to fetch user');
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    token: localStorage.getItem('token'),
    isAuthenticated: !!localStorage.getItem('token'),
    loading: false,
    error: null
  },
  reducers: {
    logout: (state) => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateProfile: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      // Register
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get Current User
      .addCase(getCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
      })
      .addCase(getCurrentUser.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      });
  }
});

// ==================== ADMIN SLICE ====================

export const fetchUsers = createAsyncThunk(
  'admin/fetchUsers',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await adminUserAPI.getAllUsers(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchPendingSubmissions = createAsyncThunk(
  'admin/fetchPendingSubmissions',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await adminTaskAPI.getAllSubmissions({ status: 'PENDING', ...params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchPayments = createAsyncThunk(
  'admin/fetchPayments',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await adminPaymentAPI.getAllPayments(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const reviewSubmission = createAsyncThunk(
  'admin/reviewSubmission',
  async ({ submissionId, reviewData }, { rejectWithValue }) => {
    try {
      const response = await adminTaskAPI.reviewSubmission(submissionId, reviewData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const verifyPayment = createAsyncThunk(
  'admin/verifyPayment',
  async (paymentId, { rejectWithValue }) => {
    try {
      const response = await adminPaymentAPI.verifyPayment(paymentId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const adminSlice = createSlice({
  name: 'admin',
  initialState: {
    dashboard: {
      stats: {},
      recentActivities: [],
      loading: false,
      error: null
    },
    users: {
      list: [],
      selectedUser: null,
      loading: false,
      error: null,
      pagination: { page: 1, limit: 20, total: 0 },
      filters: { search: '', status: 'all' }
    },
    submissions: {
      pending: [],
      all: [],
      selectedSubmission: null,
      loading: false,
      error: null,
      pagination: { page: 1, limit: 20, total: 0 },
      filters: { status: 'PENDING' }
    },
    payments: {
      list: [],
      selectedPayment: null,
      loading: false,
      error: null,
      pagination: { page: 1, limit: 20, total: 0 },
      filters: { status: 'all' }
    }
  },
  reducers: {
    setUserFilters: (state, action) => {
      state.users.filters = { ...state.users.filters, ...action.payload };
      state.users.pagination.page = 1;
    },
    setSubmissionFilters: (state, action) => {
      state.submissions.filters = { ...state.submissions.filters, ...action.payload };
      state.submissions.pagination.page = 1;
    },
    setPaymentFilters: (state, action) => {
      state.payments.filters = { ...state.payments.filters, ...action.payload };
      state.payments.pagination.page = 1;
    },
    clearErrors: (state) => {
      state.users.error = null;
      state.submissions.error = null;
      state.payments.error = null;
      state.dashboard.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Users
      .addCase(fetchUsers.pending, (state) => {
        state.users.loading = true;
        state.users.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.users.loading = false;
        state.users.list = action.payload.users || [];
        state.users.pagination = action.payload.pagination || state.users.pagination;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.users.loading = false;
        state.users.error = action.payload;
      })
      // Fetch Submissions
      .addCase(fetchPendingSubmissions.pending, (state) => {
        state.submissions.loading = true;
        state.submissions.error = null;
      })
      .addCase(fetchPendingSubmissions.fulfilled, (state, action) => {
        state.submissions.loading = false;
        state.submissions.pending = action.payload.data?.submissions || [];
        state.submissions.pagination = action.payload.data?.pagination || state.submissions.pagination;
      })
      .addCase(fetchPendingSubmissions.rejected, (state, action) => {
        state.submissions.loading = false;
        state.submissions.error = action.payload;
      })
      // Fetch Payments
      .addCase(fetchPayments.pending, (state) => {
        state.payments.loading = true;
        state.payments.error = null;
      })
      .addCase(fetchPayments.fulfilled, (state, action) => {
        state.payments.loading = false;
        state.payments.list = action.payload.data?.payments || [];
        state.payments.pagination = action.payload.data?.pagination || state.payments.pagination;
      })
      .addCase(fetchPayments.rejected, (state, action) => {
        state.payments.loading = false;
        state.payments.error = action.payload;
      })
      // Review Submission
      .addCase(reviewSubmission.pending, (state) => {
        state.submissions.loading = true;
      })
      .addCase(reviewSubmission.fulfilled, (state, action) => {
        state.submissions.loading = false;
        const idx = state.submissions.pending.findIndex(s => s.id === action.payload.id);
        if (idx !== -1) {
          state.submissions.pending[idx] = action.payload;
        }
      })
      .addCase(reviewSubmission.rejected, (state, action) => {
        state.submissions.loading = false;
        state.submissions.error = action.payload;
      })
      // Verify Payment
      .addCase(verifyPayment.pending, (state) => {
        state.payments.loading = true;
      })
      .addCase(verifyPayment.fulfilled, (state, action) => {
        state.payments.loading = false;
        const idx = state.payments.list.findIndex(p => p.id === action.payload.id);
        if (idx !== -1) {
          state.payments.list[idx] = action.payload;
        }
      })
      .addCase(verifyPayment.rejected, (state, action) => {
        state.payments.loading = false;
        state.payments.error = action.payload;
      });
  }
});

// ==================== INTERN/STUDENT SLICE ====================

export const fetchStudentDashboard = createAsyncThunk(
  'student/fetchDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const response = await internDashboardAPI.getProfile();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchEnrollments = createAsyncThunk(
  'student/fetchEnrollments',
  async (_, { rejectWithValue }) => {
    try {
      const response = await internDashboardAPI.getEnrolledInternships();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchInternshipTasks = createAsyncThunk(
  'student/fetchInternshipTasks',
  async (internshipId, { rejectWithValue }) => {
    try {
      const response = await internCourseAPI.getInternshipTasks(internshipId);
      return { internshipId, tasks: response.data?.data || [] };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const submitTaskResponse = createAsyncThunk(
  'student/submitTask',
  async ({ taskId, githubLink }, { rejectWithValue }) => {
    try {
      const response = await internSubmissionAPI.submitTask(taskId, githubLink);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const skipTaskResponse = createAsyncThunk(
  'student/skipTask',
  async (taskId, { rejectWithValue }) => {
    try {
      const response = await internSubmissionAPI.skipTask(taskId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchCertificateStatus = createAsyncThunk(
  'student/fetchCertificateStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await internCertificateAPI.getCertificateStatus();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchMyNotifications = createAsyncThunk(
  'student/fetchNotifications',
  async (_, { rejectWithValue }) => {
    try {
      const response = await internDashboardAPI.getNotifications();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const studentSlice = createSlice({
  name: 'student',
  initialState: {
    dashboard: {
      profile: {},
      loading: false,
      error: null
    },
    enrollments: {
      list: [],
      selectedEnrollment: null,
      loading: false,
      error: null
    },
    tasks: {
      byInternship: {},
      submissions: [],
      selectedTask: null,
      submitting: false,
      error: null
    },
    certificates: {
      status: null,
      eligible: false,
      loading: false,
      error: null
    },
    notifications: {
      list: [],
      unread: 0,
      loading: false,
      error: null
    }
  },
  reducers: {
    setSelectedEnrollment: (state, action) => {
      state.enrollments.selectedEnrollment = action.payload;
    },
    setSelectedTask: (state, action) => {
      state.tasks.selectedTask = action.payload;
    },
    clearErrors: (state) => {
      state.dashboard.error = null;
      state.enrollments.error = null;
      state.tasks.error = null;
      state.certificates.error = null;
      state.notifications.error = null;
    },
    markNotificationAsRead: (state, action) => {
      const notif = state.notifications.list.find(n => n.id === action.payload);
      if (notif && !notif.isRead) {
        notif.isRead = true;
        state.notifications.unread--;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Dashboard
      .addCase(fetchStudentDashboard.pending, (state) => {
        state.dashboard.loading = true;
        state.dashboard.error = null;
      })
      .addCase(fetchStudentDashboard.fulfilled, (state, action) => {
        state.dashboard.loading = false;
        state.dashboard.profile = action.payload.data || action.payload;
      })
      .addCase(fetchStudentDashboard.rejected, (state, action) => {
        state.dashboard.loading = false;
        state.dashboard.error = action.payload;
      })
      // Enrollments
      .addCase(fetchEnrollments.pending, (state) => {
        state.enrollments.loading = true;
        state.enrollments.error = null;
      })
      .addCase(fetchEnrollments.fulfilled, (state, action) => {
        state.enrollments.loading = false;
        state.enrollments.list = action.payload.data || action.payload;
      })
      .addCase(fetchEnrollments.rejected, (state, action) => {
        state.enrollments.loading = false;
        state.enrollments.error = action.payload;
      })
      // Tasks
      .addCase(fetchInternshipTasks.pending, (state) => {
        state.tasks.error = null;
      })
      .addCase(fetchInternshipTasks.fulfilled, (state, action) => {
        const { internshipId, tasks } = action.payload;
        state.tasks.byInternship[internshipId] = {
          tasks: tasks || [],
          loading: false
        };
      })
      .addCase(fetchInternshipTasks.rejected, (state, action) => {
        state.tasks.error = action.payload;
      })
      // Submit Task
      .addCase(submitTaskResponse.pending, (state) => {
        state.tasks.submitting = true;
        state.tasks.error = null;
      })
      .addCase(submitTaskResponse.fulfilled, (state, action) => {
        state.tasks.submitting = false;
        state.tasks.submissions.unshift(action.payload);
      })
      .addCase(submitTaskResponse.rejected, (state, action) => {
        state.tasks.submitting = false;
        state.tasks.error = action.payload;
      })
      // Skip Task
      .addCase(skipTaskResponse.pending, (state) => {
        state.tasks.submitting = true;
        state.tasks.error = null;
      })
      .addCase(skipTaskResponse.fulfilled, (state, action) => {
        state.tasks.submitting = false;
        state.tasks.submissions.unshift(action.payload);
      })
      .addCase(skipTaskResponse.rejected, (state, action) => {
        state.tasks.submitting = false;
        state.tasks.error = action.payload;
      })
      // Certificates
      .addCase(fetchCertificateStatus.pending, (state) => {
        state.certificates.loading = true;
        state.certificates.error = null;
      })
      .addCase(fetchCertificateStatus.fulfilled, (state, action) => {
        state.certificates.loading = false;
        state.certificates.status = action.payload.data || action.payload;
        state.certificates.eligible = action.payload.eligible || false;
      })
      .addCase(fetchCertificateStatus.rejected, (state, action) => {
        state.certificates.loading = false;
        state.certificates.error = action.payload;
      })
      // Notifications
      .addCase(fetchMyNotifications.pending, (state) => {
        state.notifications.loading = true;
      })
      .addCase(fetchMyNotifications.fulfilled, (state, action) => {
        state.notifications.loading = false;
        state.notifications.list = action.payload.data || action.payload || [];
        state.notifications.unread = state.notifications.list.filter(n => !n.isRead).length;
      })
      .addCase(fetchMyNotifications.rejected, (state, action) => {
        state.notifications.loading = false;
        state.notifications.error = action.payload;
      });
  }
});

// ==================== UI SLICE ====================

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: false,
    theme: localStorage.getItem('theme') || 'light',
    loading: false,
    notification: null
  },
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    showNotification: (state, action) => {
      state.notification = action.payload;
    },
    clearNotification: (state) => {
      state.notification = null;
    }
  }
});

// ==================== STORE ====================

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    admin: adminSlice.reducer,
    student: studentSlice.reducer,
    ui: uiSlice.reducer
  },
  devTools: process.env.NODE_ENV !== 'production'
});

// ==================== EXPORTS ====================

export const { logout, clearError, updateProfile } = authSlice.actions;
export const { setUserFilters, setSubmissionFilters, setPaymentFilters, clearErrors: clearAdminErrors } = adminSlice.actions;
export const { setSelectedEnrollment, setSelectedTask, clearErrors: clearStudentErrors, markNotificationAsRead } = studentSlice.actions;
export const { toggleSidebar, setSidebarOpen, setTheme, setLoading, showNotification, clearNotification } = uiSlice.actions;

export default store;