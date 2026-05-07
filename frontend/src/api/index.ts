import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    const { response } = error
    if (response) {
      switch (response.status) {
        case 401:
          localStorage.removeItem('token')
          ElMessage.error('登录已过期，请重新登录')
          router.push('/login')
          break
        case 403:
          ElMessage.error('没有权限访问此资源')
          break
        case 404:
          ElMessage.error('请求的资源不存在')
          break
        case 500:
          ElMessage.error('服务器错误')
          break
        default:
          ElMessage.error(response.data?.message || '请求失败')
      }
    } else {
      ElMessage.error('网络错误，请检查网络连接')
    }
    return Promise.reject(error)
  },
)

export default api

export const departmentApi = {
  getAll: () => api.get('/departments'),
  getById: (id: number) => api.get(`/departments/${id}`),
  create: (data: { name: string; description?: string }) => api.post('/departments', data),
  update: (id: number, data: { name?: string; description?: string }) => api.patch(`/departments/${id}`, data),
  delete: (id: number) => api.delete(`/departments/${id}`),
}

export const doctorApi = {
  getAll: (params?: { departmentId?: number; keyword?: string }) => api.get('/doctors', { params }),
  getById: (id: number) => api.get(`/doctors/${id}`),
  getHot: () => api.get('/doctors/hot'),
  getTodayAvailable: () => api.get('/doctors/today-available'),
  create: (data: any) => api.post('/doctors', data),
  update: (id: number, data: any) => api.patch(`/doctors/${id}`, data),
  delete: (id: number) => api.delete(`/doctors/${id}`),
}

export const scheduleApi = {
  getByDoctor: (doctorId: number) => api.get(`/schedules/doctor/${doctorId}`),
  getAvailableSlots: (doctorId: number, date: string) =>
    api.get(`/schedules/available/${doctorId}`, { params: { date } }),
  create: (data: any) => api.post('/schedules', data),
  batchCreate: (doctorId: number, schedules: any[]) =>
    api.post('/schedules/batch', { doctorId, schedules }),
  copyToNextWeek: (doctorId: number, sourceWeekDays: number[]) =>
    api.post('/schedules/copy-to-next-week', { doctorId, sourceWeekDays }),
  delete: (id: number) => api.delete(`/schedules/${id}`),
}

export const appointmentApi = {
  create: (data: any) => api.post('/appointments', data),
  getMy: () => api.get('/appointments/my'),
  getById: (id: number) => api.get(`/appointments/${id}`),
  getByDoctor: (doctorId: number, status?: string) =>
    api.get(`/appointments/doctor/${doctorId}`, { params: { status } }),
  getAll: (status?: string) => api.get('/appointments', { params: { status } }),
  updateStatus: (id: number, status: string, rejectReason?: string) =>
    api.patch(`/appointments/${id}/status`, { status, rejectReason }),
}

export const medicalRecordApi = {
  create: (data: any) => api.post('/medical-records', data),
  getMy: () => api.get('/medical-records/my'),
  getById: (id: number) => api.get(`/medical-records/${id}`),
  getByAppointment: (appointmentId: number) =>
    api.get(`/medical-records/appointment/${appointmentId}`),
}

export const reviewApi = {
  create: (data: any) => api.post('/reviews', data),
  getByDoctor: (doctorId: number) => api.get(`/reviews/doctor/${doctorId}`),
  getByAppointment: (appointmentId: number) =>
    api.get(`/reviews/appointment/${appointmentId}`),
}

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getAppointmentsByDepartment: () => api.get('/dashboard/appointments-by-department'),
  getDailyTrend: (days?: number) =>
    api.get('/dashboard/daily-trend', { params: { days } }),
  getDoctorRanking: (limit?: number) =>
    api.get('/dashboard/doctor-ranking', { params: { limit } }),
  getStatusDistribution: () => api.get('/dashboard/status-distribution'),
}
