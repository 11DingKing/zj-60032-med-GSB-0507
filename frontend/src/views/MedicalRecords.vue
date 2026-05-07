<template>
  <div class="medical-records-container">
    <el-card class="intro-card">
      <template #header>
        <span class="section-title">📋 我的问诊记录</span>
      </template>
      <p style="color: #606266;">查看您的历史问诊记录，包括主诉、诊断、处方和医嘱</p>
    </el-card>

    <div class="records-list" v-if="records.length > 0">
      <el-card
        class="record-card"
        v-for="record in records"
        :key="record.id"
        shadow="hover"
      >
        <template #header>
          <div class="record-header">
            <div class="doctor-info">
              <el-avatar :size="40" :src="record.appointment?.doctor?.avatar || record.appointment?.doctor?.user?.avatar">
                {{ (record.appointment?.doctor?.user?.realName || '医').charAt(0) }}
              </el-avatar>
              <div class="info">
                <div class="doctor-name">{{ record.appointment?.doctor?.user?.realName }}</div>
                <div class="doctor-meta">
                  {{ record.appointment?.doctor?.title }} · {{ record.appointment?.doctor?.department?.name }}
                </div>
              </div>
            </div>
            <div class="date-info">
              <el-tag type="success" effect="light">已完成</el-tag>
              <div class="date-text">{{ formatDate(record.createdAt) }}</div>
            </div>
          </div>
        </template>

        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="主诉">
            {{ record.chiefComplaint || '无' }}
          </el-descriptions-item>
          <el-descriptions-item label="诊断">
            <div class="diagnosis-content">
              {{ record.diagnosis || '无' }}
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="处方" v-if="record.prescription">
            <div class="prescription-content">
              <pre>{{ record.prescription }}</pre>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="医嘱" v-if="record.advice">
            <div class="advice-content">
              {{ record.advice }}
            </div>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>
    </div>

    <el-empty v-if="records.length === 0 && !loading" description="暂无问诊记录" />

    <div v-if="loading" class="loading-center">
      <i class="el-icon-loading" style="font-size: 32px;"></i>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { medicalRecordApi } from '@/api'

const records = ref<any[]>([])
const loading = ref(false)

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

const fetchRecords = async () => {
  loading.value = true
  try {
    const res = await medicalRecordApi.getMy()
    records.value = res.data || []
  } catch (error) {
    console.error('获取问诊记录失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchRecords()
})
</script>

<style scoped>
.medical-records-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.intro-card {
  margin-bottom: 20px;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.record-card {
  transition: all 0.3s ease;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.doctor-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.doctor-info .info .doctor-name {
  font-weight: 600;
  font-size: 16px;
  color: #303133;
}

.doctor-info .info .doctor-meta {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.date-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.date-info .date-text {
  font-size: 12px;
  color: #909399;
}

.diagnosis-content,
.prescription-content,
.advice-content {
  white-space: pre-wrap;
  line-height: 1.6;
  color: #606266;
}

.prescription-content pre {
  margin: 0;
  font-family: inherit;
  white-space: pre-wrap;
  background-color: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
}

.loading-center {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}
</style>
