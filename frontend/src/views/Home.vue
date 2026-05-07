<template>
  <div class="home-container">
    <div class="hero-section">
      <h1 class="hero-title">🏥 在线问诊预约系统</h1>
      <p class="hero-subtitle">便捷预约，专业诊疗，守护您的健康</p>
      <div class="search-box">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索医生、科室..."
          size="large"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
          <template #append>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
          </template>
        </el-input>
      </div>
    </div>

    <div class="section-margin">
      <h2 class="section-title">🏥 科室导航</h2>
      <div class="department-grid">
        <div
          v-for="dept in departments"
          :key="dept.id"
          class="department-item"
          @click="goDepartment(dept.id)"
        >
          <div class="department-icon">{{ getDepartmentIcon(dept.name) }}</div>
          <div class="department-name">{{ dept.name }}</div>
          <div class="department-count">{{ dept._count?.doctors || 0 }} 位医生</div>
        </div>
      </div>
    </div>

    <div class="section-margin">
      <h2 class="section-title">⭐ 热门医生推荐</h2>
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="8" :lg="8" v-for="doctor in hotDoctors" :key="doctor.id">
          <div class="doctor-card card-hover" @click="goDoctor(doctor.id)">
            <el-avatar :size="80" :src="doctor.avatar || doctor.user?.avatar">
              {{ (doctor.user?.realName || doctor.id).charAt(0) }}
            </el-avatar>
            <div class="doctor-info">
              <div class="doctor-name">{{ doctor.user?.realName }}</div>
              <div class="doctor-title">{{ doctor.title }} · {{ doctor.department?.name }}</div>
              <div class="doctor-specialty">{{ doctor.specialty }}</div>
              <div class="doctor-rating">
                <el-rate v-model="doctor.rating" disabled :max="5" :show-text="false" />
                <span style="margin-left: 8px; color: #909399;">{{ doctor.reviewCount }} 条评价</span>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <div class="section-margin">
      <h2 class="section-title">📅 今日可预约医生</h2>
      <el-row :gutter="20" v-if="todayDoctors.length > 0">
        <el-col :xs="24" :sm="12" :md="8" :lg="6" v-for="doctor in todayDoctors" :key="doctor.id">
          <div class="doctor-card card-hover" @click="goDoctor(doctor.id)">
            <el-avatar :size="60" :src="doctor.avatar || doctor.user?.avatar">
              {{ (doctor.user?.realName || doctor.id).charAt(0) }}
            </el-avatar>
            <div class="doctor-info">
              <div class="doctor-name">{{ doctor.user?.realName }}</div>
              <div class="doctor-title">{{ doctor.title }}</div>
              <div class="doctor-specialty">{{ doctor.department?.name }}</div>
              <el-tag type="success" size="small">今日可预约</el-tag>
            </div>
          </div>
        </el-col>
      </el-row>
      <el-empty v-else description="暂无今日可预约医生" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from '@element-plus/icons-vue'
import { departmentApi, doctorApi } from '@/api'

const router = useRouter()

const searchKeyword = ref('')
const departments = ref<any[]>([])
const hotDoctors = ref<any[]>([])
const todayDoctors = ref<any[]>([])

const getDepartmentIcon = (name: string) => {
  const icons: Record<string, string> = {
    '内科': '🫀',
    '外科': '🩹',
    '儿科': '👶',
    '妇科': '👩',
    '眼科': '👁️',
    '骨科': '🦴',
    '皮肤科': '🧴',
    '口腔科': '🦷',
  }
  return icons[name] || '🏥'
}

const goDepartment = (id: number) => {
  router.push({ path: '/doctors', query: { departmentId: id } })
}

const goDoctor = (id: number) => {
  router.push(`/doctor/${id}`)
}

const handleSearch = () => {
  if (searchKeyword.value.trim()) {
    router.push({ path: '/doctors', query: { keyword: searchKeyword.value } })
  }
}

const fetchData = async () => {
  try {
    const [deptRes, hotRes, todayRes] = await Promise.all([
      departmentApi.getAll(),
      doctorApi.getHot(),
      doctorApi.getTodayAvailable(),
    ])
    departments.value = deptRes.data
    hotDoctors.value = hotRes.data
    todayDoctors.value = todayRes.data
  } catch (error) {
    console.error('获取数据失败:', error)
  }
}

onMounted(() => {
  fetchData()
})
</script>
