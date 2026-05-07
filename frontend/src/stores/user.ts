import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api'

interface User {
  id: number
  username: string
  realName: string
  role: string
  avatar?: string
  doctorId?: number
  patientId?: number
}

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<User | null>(null)

  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const isDoctor = computed(() => user.value?.role === 'DOCTOR')
  const isPatient = computed(() => user.value?.role === 'PATIENT')

  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  const setUser = (newUser: User) => {
    user.value = newUser
  }

  const login = async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password })
    setToken(response.data.access_token)
    setUser(response.data.user)
    return response.data
  }

  const register = async (userData: {
    username: string
    password: string
    realName: string
    phone?: string
    age?: number
    gender?: string
  }) => {
    const response = await api.post('/auth/register', userData)
    return response.data
  }

  const fetchProfile = async () => {
    const response = await api.get('/auth/profile')
    setUser(response.data)
    return response.data
  }

  const logout = () => {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
  }

  return {
    token,
    user,
    isLoggedIn,
    isAdmin,
    isDoctor,
    isPatient,
    setToken,
    setUser,
    login,
    register,
    fetchProfile,
    logout,
  }
})
