<template>
  <div class="profile-container">
    <el-card class="profile-card">
      <template #header>
        <div class="card-header">
          <span class="section-title">👤 个人信息</span>
        </div>
      </template>

      <div class="profile-content">
        <div class="avatar-section">
          <el-avatar :size="120" :src="userStore.user?.avatar">
            {{ (userStore.user?.realName || '用').charAt(0) }}
          </el-avatar>
          <div class="user-basic">
            <h2 class="user-name">{{ userStore.user?.realName }}</h2>
            <div class="user-role">
              <el-tag :type="roleTagType" effect="light" size="large">
                {{ roleText }}
              </el-tag>
            </div>
            <p class="user-username">用户名：{{ userStore.user?.username }}</p>
          </div>
        </div>

        <el-divider />

        <div class="info-section">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="用户ID" v-if="userStore.user?.id">
              {{ userStore.user.id }}
            </el-descriptions-item>
            <el-descriptions-item label="角色">
              <el-tag :type="roleTagType" effect="light">
                {{ roleText }}
              </el-tag>
            </el-descriptions-item>

            <template v-if="userStore.isDoctor">
              <el-descriptions-item label="职称">
                {{ doctorInfo?.title || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="所属科室">
                {{ doctorInfo?.department?.name || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="擅长领域" :span="2">
                {{ doctorInfo?.specialty || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="平均评分">
                <div class="rating-display">
                  <el-rate
                    :model-value="doctorInfo?.rating"
                    disabled
                    :max="5"
                    :show-text="false"
                    size="small"
                  />
                  <span style="margin-left: 8px;">{{ doctorInfo?.rating?.toFixed(1) || '暂无' }}</span>
                </div>
              </el-descriptions-item>
              <el-descriptions-item label="评价数">
                {{ doctorInfo?.reviewCount || 0 }} 条
              </el-descriptions-item>
            </template>

            <template v-if="userStore.isPatient">
              <el-descriptions-item label="年龄">
                {{ patientInfo?.age ? patientInfo.age + ' 岁' : '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="性别">
                {{ patientInfo?.gender || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="手机号">
                {{ patientInfo?.user?.phone || patientInfo?.phone || userStore.user?.phone || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="注册时间">
                {{ formatDate(patientInfo?.createdAt || patientInfo?.user?.createdAt || userStore.user?.createdAt) }}
              </el-descriptions-item>
            </template>

            <template v-if="userStore.isAdmin">
              <el-descriptions-item label="账号状态" :span="2">
                <el-tag type="success" effect="light">正常</el-tag>
              </el-descriptions-item>
            </template>
          </el-descriptions>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { doctorApi } from '@/api'

const userStore = useUserStore()

const doctorInfo = ref<any>(null)
const patientInfo = ref<any>(null)

const roleText = computed(() => {
  const role = userStore.user?.role
  const roles: Record<string, string> = {
    ADMIN: '管理员',
    DOCTOR: '医生',
    PATIENT: '患者',
  }
  return roles[role || ''] || role
})

const roleTagType = computed(() => {
  const role = userStore.user?.role
  const types: Record<string, string> = {
    ADMIN: 'danger',
    DOCTOR: 'primary',
    PATIENT: 'success',
  }
  return types[role || ''] || 'info'
})

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

const fetchDoctorInfo = async () => {
  const doctorId = userStore.user?.doctorId
  if (doctorId) {
    try {
      const res = await doctorApi.getById(doctorId)
      doctorInfo.value = res.data
    } catch (error) {
      console.error('获取医生信息失败:', error)
    }
  }
}

onMounted(() => {
  if (userStore.isDoctor) {
    fetchDoctorInfo()
  }
})
</script>

<style scoped>
.profile-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.profile-card {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.profile-content {
  padding: 10px 0;
}

.avatar-section {
  display: flex;
  align-items: flex-start;
  gap: 24px;
}

.user-basic {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.user-name {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  margin: 0;
}

.user-username {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.info-section {
  margin-top: 16px;
}

.rating-display {
  display: flex;
  align-items: center;
}
</style>
