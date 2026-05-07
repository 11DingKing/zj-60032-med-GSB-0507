<template>
  <div class="admin-appointments-container">
    <el-card class="header-card">
      <template #header>
        <div class="card-header">
          <span class="section-title">📋 预约管理</span>
        </div>
      </template>

      <el-form :inline="true" :model="searchForm" style="margin-top: 16px;">
        <el-form-item label="状态">
          <el-select
            v-model="searchForm.status"
            placeholder="选择状态"
            clearable
            style="width: 160px"
            @change="handleSearch"
          >
            <el-option label="待确认" value="PENDING" />
            <el-option label="已确认" value="CONFIRMED" />
            <el-option label="就诊中" value="IN_PROGRESS" />
            <el-option label="已完成" value="COMPLETED" />
            <el-option label="已取消" value="CANCELLED" />
            <el-option label="已拒绝" value="REJECTED" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker
            v-model="searchForm.date"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 280px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card>
      <el-table :data="appointments" style="width: 100%" v-loading="loading" stripe>
        <el-table-column prop="id" label="预约编号" width="120">
          <template #default="{ row }">
            <span style="font-family: monospace; font-weight: 600;">#{{ row.id }}</span>
          </template>
        </el-table-column>
        <el-table-column label="患者信息" min-width="180">
          <template #default="{ row }">
            <div class="patient-info-cell">
              <el-avatar :size="40">
                {{ (row.patient?.user?.realName || '患').charAt(0) }}
              </el-avatar>
              <div class="info">
                <div class="name">{{ row.patient?.user?.realName }}</div>
                <div class="meta">
                  {{ row.patient?.age ? row.patient.age + '岁' : '' }}
                  {{ row.patient?.gender || '' }}
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="医生信息" min-width="180">
          <template #default="{ row }">
            <div class="patient-info-cell">
              <el-avatar :size="40" :src="row.doctor?.avatar || row.doctor?.user?.avatar">
                {{ (row.doctor?.user?.realName || '医').charAt(0) }}
              </el-avatar>
              <div class="info">
                <div class="name">{{ row.doctor?.user?.realName }}</div>
                <div class="meta">
                  {{ row.doctor?.title }} · {{ row.doctor?.department?.name }}
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="预约时间" width="180">
          <template #default="{ row }">
            <div class="time-cell">
              <div class="date">{{ row.date }}</div>
              <div class="time">{{ row.startTime }} - {{ row.endTime }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" effect="light" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="症状描述" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.symptoms || '无' }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleView(row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="appointments.length === 0 && !loading" description="暂无预约数据" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { appointmentApi } from '@/api'

const router = useRouter()

const appointments = ref<any[]>([])
const loading = ref(false)

const searchForm = reactive({
  status: '',
  date: [] as string[],
})

const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    PENDING: 'warning',
    CONFIRMED: 'primary',
    IN_PROGRESS: 'info',
    COMPLETED: 'success',
    CANCELLED: 'danger',
    REJECTED: 'danger',
  }
  return types[status] || 'info'
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    PENDING: '待确认',
    CONFIRMED: '已确认',
    IN_PROGRESS: '就诊中',
    COMPLETED: '已完成',
    CANCELLED: '已取消',
    REJECTED: '已拒绝',
  }
  return texts[status] || status
}

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

const fetchAppointments = async () => {
  loading.value = true
  try {
    const params: any = {}
    if (searchForm.status) params.status = searchForm.status
    const res = await appointmentApi.getAll()
    appointments.value = res.data || []
    
    if (searchForm.status) {
      appointments.value = appointments.value.filter((a: any) => a.status === searchForm.status)
    }
  } catch (error) {
    console.error('获取预约列表失败:', error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  fetchAppointments()
}

const handleReset = () => {
  searchForm.status = ''
  searchForm.date = []
  fetchAppointments()
}

const handleView = (row: any) => {
  router.push(`/appointment/${row.id}`)
}

onMounted(() => {
  fetchAppointments()
})
</script>

<style scoped>
.admin-appointments-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.header-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.patient-info-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.patient-info-cell .info .name {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
  margin-bottom: 2px;
}

.patient-info-cell .info .meta {
  font-size: 12px;
  color: #909399;
}

.time-cell .date {
  font-weight: 500;
  color: #303133;
  font-size: 14px;
}

.time-cell .time {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}
</style>
