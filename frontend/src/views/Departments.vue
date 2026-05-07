<template>
  <div class="departments-container">
    <el-card class="intro-card">
      <template #header>
        <span class="section-title">🏥 科室导航</span>
      </template>
      <p style="color: #606266; margin-bottom: 20px;">选择科室，查看该科室的医生信息和排班情况</p>
    </el-card>

    <el-row :gutter="20">
      <el-col
        :xs="12"
        :sm="8"
        :md="6"
        :lg="4"
        v-for="dept in departments"
        :key="dept.id"
      >
        <div class="department-card card-hover" @click="goDepartment(dept)">
          <div class="dept-icon">{{ getDepartmentIcon(dept.name) }}</div>
          <div class="dept-name">{{ dept.name }}</div>
          <div class="dept-count">
            <el-tag size="small" type="primary">{{ dept._count?.doctors || 0 }} 位医生</el-tag>
          </div>
        </div>
      </el-col>
    </el-row>

    <div v-if="loading" class="loading-center">
      <i class="el-icon-loading" style="font-size: 32px;"></i>
    </div>

    <el-empty v-if="departments.length === 0 && !loading" description="暂无科室数据" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { departmentApi } from '@/api'

const router = useRouter()

const departments = ref<any[]>([])
const loading = ref(false)

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
    '耳鼻喉科': '👂',
    '神经内科': '🧠',
    '心血管内科': '❤️',
  }
  return icons[name] || '🏥'
}

const goDepartment = (dept: any) => {
  router.push({ path: '/doctors', query: { departmentId: dept.id } })
}

const fetchDepartments = async () => {
  loading.value = true
  try {
    const res = await departmentApi.getAll()
    departments.value = res.data
  } catch (error) {
    console.error('获取科室列表失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDepartments()
})
</script>

<style scoped>
.departments-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.intro-card {
  margin-bottom: 24px;
}

.department-card {
  background-color: #fff;
  border-radius: 12px;
  padding: 24px 16px;
  text-align: center;
  cursor: pointer;
  margin-bottom: 20px;
  border: 1px solid #ebeef5;
}

.dept-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.dept-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.dept-count {
  display: flex;
  justify-content: center;
}

.loading-center {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}
</style>
