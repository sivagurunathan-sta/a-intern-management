// frontend/src/services/api.js - UPDATED WITH ANALYTICS

import axios from 'axios';

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
const REQUEST_TIMEOUT = 30000;
const config = {
  JWT_TOKEN_KEY: 'token',
  USER_KEY: 'user'
};

console.log('🔗 API Base URL:', API_BASE_URL);

// ============================================================================
// AXIOS INSTANCE
// ============================================================================

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// REQUEST INTERCEPTOR - Attach JWT Token
// ============================================================================

api.interceptors.request.use(
  (request) => {
    const token = localStorage.getItem(config.JWT_TOKEN_KEY);
    if (token) {
      request.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`🚀 ${request.method.toUpperCase()} ${request.url}`);
    return request;
  },
  (error) => {
    console.error('❌ Request Error:', error.message);
    return Promise.reject(error);
  }
);

// ============================================================================
// RESPONSE INTERCEPTOR - Handle Errors
// ============================================================================

api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.config.url}`);
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;

    console.error(`❌ API Error [${status}]:`, message);

    if (status === 401) {
      localStorage.removeItem(config.JWT_TOKEN_KEY);
      localStorage.removeItem(config.USER_KEY);
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject({
      status,
      message,
      data: error.response?.data,
    });
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem(config.JWT_TOKEN_KEY, token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem(config.JWT_TOKEN_KEY);
    delete api.defaults.headers.common['Authorization'];
  }
};

export const getAuthToken = () => localStorage.getItem(config.JWT_TOKEN_KEY);

export const clearAuth = () => {
  localStorage.removeItem(config.JWT_TOKEN_KEY);
  localStorage.removeItem(config.USER_KEY);
  delete api.defaults.headers.common['Authorization'];
};

export const getBaseURL = () => API_BASE_URL;

// ============================================================================
// 🔐 AUTHENTICATION APIs
// ============================================================================

export const authAPI = {
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data?.data?.token) {
        setAuthToken(response.data.data.token);
        localStorage.setItem(config.USER_KEY, JSON.stringify(response.data.data.user));
      }
      return response;
    } catch (error) {
      throw error;
    }
  },

  register: async (name, email, password) => {
    try {
      const response = await api.post('/auth/register', { name, email, password });
      return response;
    } catch (error) {
      throw error;
    }
  },

  getProfile: async () => {
    try {
      const response = await api.get('/auth/me');
      return response;
    } catch (error) {
      throw error;
    }
  },

  logout: () => {
    clearAuth();
    window.location.href = '/login';
  }
};

// ============================================================================
// 👨‍💼 ADMIN - USER MANAGEMENT APIs
// ============================================================================

export const adminUserAPI = {
  getAllUsers: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.search) queryParams.append('search', params.search);
      if (params.status) queryParams.append('status', params.status);
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      const response = await api.get(`/admin/users?${queryParams.toString()}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  getUserProfile: async (userId) => {
    try {
      const response = await api.get(`/admin/users/${userId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  bulkAddUsers: async (payload) => {
    try {
      const response = await api.post('/admin/users/bulk-add', payload);
      return response;
    } catch (error) {
      throw error;
    }
  },

  bulkGenerateUsers: async (count = 10, prefix = 'INT') => {
    try {
      const response = await api.post('/admin/users/bulk-generate', {
        count,
        prefix,
        role: 'INTERN',
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  updateUser: async (userId, updates) => {
    try {
      const response = await api.put(`/admin/users/${userId}`, updates);
      return response;
    } catch (error) {
      throw error;
    }
  },

  revokeAccess: async (userId) => {
    try {
      const response = await api.post(`/admin/users/${userId}/revoke`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  restoreAccess: async (userId) => {
    try {
      const response = await api.post(`/admin/users/${userId}/restore`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  getDashboardStats: async () => {
    try {
      const response = await api.get('/admin/dashboard/stats');
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// ============================================================================
// 💰 ADMIN - PAYMENT VERIFICATION APIs
// ============================================================================

export const adminPaymentAPI = {
  getAllPayments: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.status) queryParams.append('status', params.status);
      if (params.search) queryParams.append('search', params.search);
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      const response = await api.get(`/admin/payments?${queryParams.toString()}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  getPaymentStats: async () => {
    try {
      const response = await api.get('/admin/payments/stats');
      return response;
    } catch (error) {
      throw error;
    }
  },

  getPayment: async (paymentId) => {
    try {
      const response = await api.get(`/admin/payments/${paymentId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  verifyPayment: async (paymentId, data = {}) => {
    try {
      const response = await api.post(`/admin/payments/${paymentId}/verify`, data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  rejectPayment: async (paymentId, data = {}) => {
    try {
      const response = await api.post(`/admin/payments/${paymentId}/reject`, data);
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// ============================================================================
// 📋 ADMIN - TASK & SUBMISSION APIs
// ============================================================================

export const adminTaskAPI = {
  getAllSubmissions: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.status) queryParams.append('status', params.status);
      if (params.internshipId) queryParams.append('internshipId', params.internshipId);
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      const response = await api.get(`/admin/submissions?${queryParams.toString()}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  getSubmission: async (submissionId) => {
    try {
      const response = await api.get(`/admin/submissions/${submissionId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  reviewSubmission: async (submissionId, reviewData) => {
    try {
      const response = await api.put(`/admin/submissions/${submissionId}/review`, {
        status: reviewData.status,
        score: reviewData.score,
        feedback: reviewData.feedback,
      });
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// ============================================================================
// 👨‍🎓 INTERN - DASHBOARD APIs
// ============================================================================

export const internDashboardAPI = {
  getProfile: async () => {
    try {
      const response = await api.get('/intern/profile');
      return response;
    } catch (error) {
      throw error;
    }
  },

  getEnrolledInternships: async () => {
    try {
      const response = await api.get('/intern/enrollments');
      return response;
    } catch (error) {
      throw error;
    }
  },

  getNotifications: async () => {
    try {
      const response = await api.get('/intern/notifications');
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// ============================================================================
// 📚 INTERN - COURSE & TASK APIs
// ============================================================================

export const internCourseAPI = {
  getAvailableInternships: async () => {
    try {
      const response = await api.get('/internships');
      return response;
    } catch (error) {
      throw error;
    }
  },

  enrollInInternship: async (internshipId) => {
    try {
      const response = await api.post(`/internships/${internshipId}/enroll`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  getInternshipTasks: async (internshipId) => {
    try {
      const response = await api.get(`/internships/${internshipId}/tasks`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  getTaskDetails: async (taskId) => {
    try {
      const response = await api.get(`/tasks/${taskId}`);
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// ============================================================================
// 💻 INTERN - SUBMISSION APIs
// ============================================================================

export const internSubmissionAPI = {
  submitTask: async (taskId, githubLink) => {
    try {
      const response = await api.post(`/tasks/${taskId}/submit`, {
        githubLink,
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  skipTask: async (taskId) => {
    try {
      const response = await api.post(`/tasks/${taskId}/skip`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  getMySubmissions: async () => {
    try {
      const response = await api.get('/intern/submissions');
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// ============================================================================
// 🎓 INTERN - CERTIFICATE & PAYMENT APIs
// ============================================================================

export const internCertificateAPI = {
  getCertificateStatus: async (enrollmentId) => {
    try {
      const response = await api.get(`/enrollments/${enrollmentId}/certificate-status`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  downloadCertificate: async (enrollmentId) => {
    try {
      const response = await api.get(`/certificates/download/${enrollmentId}`);
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// ============================================================================
// 💳 INTERN - PAYMENT APIs
// ============================================================================

export const internPaymentAPI = {
  getPaymentStatus: async (enrollmentId) => {
    try {
      const response = await api.get(`/intern/payments/status/${enrollmentId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  initiatePayment: async (paymentData) => {
    try {
      const response = await api.post('/intern/payments/initiate', paymentData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  getMyPayments: async () => {
    try {
      const response = await api.get('/intern/payments/my-payments');
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// ============================================================================
// 📊 ADMIN - ANALYTICS APIs (NEW)
// ============================================================================

export const analyticsAPI = {
  getDashboard: async () => {
    try {
      const response = await api.get('/admin/analytics/dashboard');
      return response.data;
    } catch (error) {
      console.error('Error fetching analytics dashboard:', error);
      throw error;
    }
  },

  getSubmissions: async () => {
    try {
      const response = await api.get('/admin/analytics/submissions');
      return response.data;
    } catch (error) {
      console.error('Error fetching submission analytics:', error);
      throw error;
    }
  },

  getPayments: async () => {
    try {
      const response = await api.get('/admin/analytics/payments');
      return response.data;
    } catch (error) {
      console.error('Error fetching payment analytics:', error);
      throw error;
    }
  },

  getCertificates: async () => {
    try {
      const response = await api.get('/admin/analytics/certificates');
      return response.data;
    } catch (error) {
      console.error('Error fetching certificate analytics:', error);
      throw error;
    }
  },

  getInternships: async () => {
    try {
      const response = await api.get('/admin/analytics/internships');
      return response.data;
    } catch (error) {
      console.error('Error fetching internship analytics:', error);
      throw error;
    }
  },

  getUsers: async () => {
    try {
      const response = await api.get('/admin/analytics/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      throw error;
    }
  },

  exportAnalytics: async () => {
    try {
      const response = await api.get('/admin/analytics/export');
      return response.data;
    } catch (error) {
      console.error('Error exporting analytics:', error);
      throw error;
    }
  }
};

// ============================================================================
// GENERIC HTTP METHODS (Optional Helpers)
// ============================================================================

export const get = async (url, params = {}) => {
  try {
    const response = await api.get(url, { params });
    return response;
  } catch (error) {
    throw error;
  }
};

export const post = async (url, data = {}) => {
  try {
    const response = await api.post(url, data);
    return response;
  } catch (error) {
    throw error;
  }
};

export const put = async (url, data = {}) => {
  try {
    const response = await api.put(url, data);
    return response;
  } catch (error) {
    throw error;
  }
};

export const patch = async (url, data = {}) => {
  try {
    const response = await api.patch(url, data);
    return response;
  } catch (error) {
    throw error;
  }
};

export const del = async (url) => {
  try {
    const response = await api.delete(url);
    return response;
  } catch (error) {
    throw error;
  }
};

export const uploadFile = async (url, formData, onUploadProgress = null) => {
  try {
    const response = await api.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onUploadProgress
        ? (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onUploadProgress(percentCompleted);
          }
        : undefined,
    });
    return response;
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export default api;
export { api, API_BASE_URL };