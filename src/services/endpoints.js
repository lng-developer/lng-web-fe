// Hằng số đường dẫn API, dùng cùng apiClient (@/services/axiosInstance) trong
// features/<name>/api/. Thêm nhóm endpoint mới theo feature khi có API thực tế.
export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    ME: '/api/auth/me',
    REFRESH: '/api/auth/refresh',
  },
  HOME: {
    SUMMARY: '/home/summary',
  },
}
