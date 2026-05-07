<template>
  <div class="appointments-container">
    <el-card class="filter-card">
      <template #header>
        <div class="card-header">
          <span>📅 我的预约</span>
          <el-radio-group v-model="filterStatus" size="small" @change="fetchAppointments">
            <el-radio-button label="">全部</el-radio-button>
            <el-radio-button label="PENDING">待确认</el-radio-button>
            <el-radio-button label="CONFIRMED">已确认</el-radio-button>
            <el-radio-button label="IN_PROGRESS">就诊中</el-radio-button>
            <el-radio-button label="COMPLETED">已完成</el-radio-button>
            <el-radio-button label="CANCELLED">已取消</el-radio-button>
          </el-radio-group>
        </div>
      </template>

      <el-table :data="appointments" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="预约编号" width="120">
          <template #default="{ row }">
            <span style="font-family: monospace;">#{{ row.id }}</span>
          </template>
        </el-table-column>
        <el-table-column label="医生" width="180">
          <template #default="{ row }">
            <div class="doctor-cell">
              <el-avatar :size="36" :src="row.doctor?.avatar || row.doctor?.user?.avatar">
                {{ (row.doctor?.user?.realName || '医').charAt(0) }}
              </el-avatar>
              <div class="doctor-info">
                <div class="name">{{ row.doctor?.user?.realName }}</div>
                <div class="title">{{ row.doctor?.title }} · {{ row.doctor?.department?.name }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="预约时间" width="200">
          <template #default="{ row }">
            <div class="time-cell">
              <div class="date">{{ row.date }}</div>
              <div class="time">{{ row.startTime }} - {{ row.endTime }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" effect="light">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="症状描述" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.symptoms || '无' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="goDetail(row)">
              查看详情
            </el-button>
            <el-button
              type="danger"
              link
              size="small"
              v-if="canCancel(row.status)"
              @click="handleCancel(row)"
            >
              取消预约
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="appointments.length === 0 && !loading" description="暂无预约记录" />
    </el-card>

    <el-dialog
      v-model="showCancelDialog"
      title="取消预约"
      width="400px"
    >
      <p>确定要取消该预约吗？</p>
      <el-form label-width="80px" style="margin-top: 20px;">
        <el-form-item label="取消原因">
          <el-input
            v-model="cancelReason"
            type="textarea"
            :rows="3"
            placeholder="请输入取消原因（选填）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCancelDialog = false">取消</el-button>
        <el-button type="danger" :loading="cancelling" @click="confirmCancel">
          确认取消
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { appointmentApi } from '@/api'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const appointments = ref<any[]>([])
const loading = ref(false)
const filterStatus = ref('')
const showCancelDialog = ref(false)
const cancelReason = ref('')
const cancelling = ref(false)
const selectedAppointment = ref<any>(null)

const isDoctor = computed(() => userStore.isDoctor)

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

const canCancel = (status: string) => {
  return !isDoctor.value && ['PENDING', 'CONFIRMED'].includes(status)
}

const goDetail = (row: any) => {
  router.push(`/appointment/${row.id}`)
}

const handleCancel = (row: any) => {
  selectedAppointment.value = row
  cancelReason.value = ''
  showCancelDialog.value = true
}

const confirmCancel = async () => {
  if (!selectedAppointment.value) return
  cancelling.value = true
  try {
    await appointmentApi.updateStatus(
      selectedAppointment.value.id,
      'CANCELLED',
      cancelReason.value || undefined
    )
    ElMessage.success('预约已取消')
    showCancelDialog.value = false
    fetchAppointments()
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '取消失败')
  } finally {
    cancelling.value = false
  }
}

const fetchAppointments = async () => {
  loading.value = true
  try {
    let res
    if (isDoctor.value) {
      const doctorId = userStore.user?.doctorId
      if (doctorId) {
        res = await appointmentApi.getByDoctor(doctorId, filterStatus.value || undefined)
      }
    } else {
      res = await appointmentApi.getMy()
    }
    appointments.value = res?.data || []
    if (filterStatus.value) {
      appointments.value = appointments.value.filter((a: any) => a.status === filterStatus.value)
    }
  } catch (error) {
    console.error('获取预约列表失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchAppointments()
})
</script>

<style scoped>
.appointments-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.doctor-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.doctor-info .name {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}

.doctor-info .title {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.time-cell .date {
  font-weight: 500;
  color: #303133;
}

.time-cell .time {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>
