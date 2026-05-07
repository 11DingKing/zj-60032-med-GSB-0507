<template>
  <div class="layout-container">
    <header class="header-container">
      <div class="header-left">
        <div class="logo" @click="goHome">🏥 在线问诊</div>
        <div class="nav-menu">
          <div
            class="nav-item"
            :class="{ active: isActiveRoute('/') }"
            @click="goHome"
          >
            首页
          </div>
          <div
            class="nav-item"
            :class="{ active: isActiveRoute('/departments') }"
            @click="goDepartments"
          >
            科室导航
          </div>
          <div
            class="nav-item"
            :class="{ active: isActiveRoute('/doctors') }"
            @click="goDoctors"
          >
            医生列表
          </div>
        </div>
      </div>
      <div class="header-right">
        <template v-if="userStore.isLoggedIn">
          <div class="user-info">
            <el-dropdown @command="handleCommand">
              <span class="el-dropdown-link">
                <el-avatar :size="36" :src="userStore.user?.avatar">
                  {{ userStore.user?.realName?.charAt(0) }}
                </el-avatar>
                <span style="margin-left: 8px">{{ userStore.user?.realName }}</span>
                <el-icon><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                  <el-dropdown-item command="appointments" v-if="userStore.isPatient">
                    我的预约
                  </el-dropdown-item>
                  <el-dropdown-item command="medical-records" v-if="userStore.isPatient">
                    问诊记录
                  </el-dropdown-item>
                  <el-dropdown-item command="schedule" v-if="userStore.isDoctor">
                    排班管理
                  </el-dropdown-item>
                  <el-dropdown-item command="dashboard" v-if="userStore.isAdmin">
                    数据看板
                  </el-dropdown-item>
                  <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>
        <template v-else>
          <el-button type="primary" @click="goLogin">登录</el-button>
          <el-button @click="goRegister">注册</el-button>
        </template>
      </div>
    </header>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ArrowDown } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const goHome = () => router.push('/')
const goDepartments = () => router.push('/departments')
const goDoctors = () => router.push('/doctors')
const goLogin = () => router.push('/login')
const goRegister = () => router.push('/register')

const isActiveRoute = (path: string) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}

const handleCommand = (command: string) => {
  switch (command) {
    case 'profile':
      router.push('/profile')
      break
    case 'appointments':
      router.push('/appointments')
      break
    case 'medical-records':
      router.push('/medical-records')
      break
    case 'schedule':
      router.push('/schedule')
      break
    case 'dashboard':
      router.push('/dashboard')
      break
    case 'logout':
      userStore.logout()
      ElMessage.success('已退出登录')
      router.push('/')
      break
  }
}
</script>
