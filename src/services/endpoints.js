// Hằng số đường dẫn API, dùng cùng apiClient (@/services/axiosInstance) trong
// features/<name>/api/. Thêm nhóm endpoint mới theo feature khi có API thực tế.
export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REFRESH: '/api/auth/refresh',
    ME: '/api/auth/me',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
  },
  HOME: {
    SUMMARY: '/home/summary',
  },
}
