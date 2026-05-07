import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@/views/Home.vue'),
        meta: { requiresAuth: false },
      },
      {
        path: 'departments',
        name: 'Departments',
        component: () => import('@/views/Departments.vue'),
        meta: { requiresAuth: false },
      },
      {
        path: 'doctors',
        name: 'Doctors',
        component: () => import('@/views/Doctors.vue'),
        meta: { requiresAuth: false },
      },
      {
        path: 'doctor/:id',
        name: 'DoctorDetail',
        component: () => import('@/views/DoctorDetail.vue'),
        meta: { requiresAuth: false },
      },
      {
        path: 'appointments',
        name: 'MyAppointments',
        component: () => import('@/views/Appointments.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'appointment/:id',
        name: 'AppointmentDetail',
        component: () => import('@/views/AppointmentDetail.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'medical-records',
        name: 'MedicalRecords',
        component: () => import('@/views/MedicalRecords.vue'),
        meta: { requiresAuth: true, roles: ['PATIENT'] },
      },
      {
        path: 'schedule',
        name: 'ScheduleManage',
        component: () => import('@/views/ScheduleManage.vue'),
        meta: { requiresAuth: true, roles: ['DOCTOR'] },
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { requiresAuth: true, roles: ['ADMIN'] },
      },
      {
        path: 'admin/departments',
        name: 'AdminDepartments',
        component: () => import('@/views/admin/Departments.vue'),
        meta: { requiresAuth: true, roles: ['ADMIN'] },
      },
      {
        path: 'admin/doctors',
        name: 'AdminDoctors',
        component: () => import('@/views/admin/Doctors.vue'),
        meta: { requiresAuth: true, roles: ['ADMIN'] },
      },
      {
        path: 'admin/appointments',
        name: 'AdminAppointments',
        component: () => import('@/views/admin/Appointments.vue'),
        meta: { requiresAuth: true, roles: ['ADMIN'] },
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/Profile.vue'),
        meta: { requiresAuth: true },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to, _from, next) => {
  const userStore = useUserStore()
  
  if (!userStore.isLoggedIn && userStore.token) {
    try {
      await userStore.fetchProfile()
    } catch {
      userStore.logout()
    }
  }

  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
    return
  }

  if (to.meta.roles && to.meta.roles.length > 0) {
    const hasRole = (to.meta.roles as string[]).includes(userStore.user?.role || '')
    if (!hasRole) {
      next({ name: 'Home' })
      return
    }
  }

  next()
})

export default router
