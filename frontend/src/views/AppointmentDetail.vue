<template>
  <div class="appointment-detail-container">
    <div v-if="loading" class="loading-center">
      <i class="el-icon-loading" style="font-size: 48px;"></i>
    </div>

    <template v-else-if="appointment">
      <el-card class="info-card">
        <template #header>
          <div class="card-header">
            <span>📋 预约详情</span>
            <el-tag :type="getStatusType(appointment.status)" size="large" effect="light">
              {{ getStatusText(appointment.status) }}
            </el-tag>
          </div>
        </template>

        <el-descriptions :column="2" border>
          <el-descriptions-item label="预约编号">
            <span style="font-family: monospace; font-weight: 600;">#{{ appointment.id }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="预约状态">
            <el-tag :type="getStatusType(appointment.status)" effect="light">
              {{ getStatusText(appointment.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="预约日期">
            {{ appointment.date }}
          </el-descriptions-item>
          <el-descriptions-item label="预约时段">
            {{ appointment.startTime }} - {{ appointment.endTime }}
          </el-descriptions-item>
          <el-descriptions-item label="医生">
            <div class="doctor-info-inline">
              <el-avatar :size="32" :src="appointment.doctor?.avatar || appointment.doctor?.user?.avatar">
                {{ (appointment.doctor?.user?.realName || '医').charAt(0) }}
              </el-avatar>
              <div class="info">
                <div class="name">{{ appointment.doctor?.user?.realName }}</div>
                <div class="meta">{{ appointment.doctor?.title }} · {{ appointment.doctor?.department?.name }}</div>
              </div>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="患者">
            <div class="doctor-info-inline">
              <el-avatar :size="32">
                {{ (appointment.patient?.user?.realName || '患').charAt(0) }}
              </el-avatar>
              <div class="info">
                <div class="name">{{ appointment.patient?.user?.realName }}</div>
                <div class="meta">{{ appointment.patient?.age || '' }}岁 · {{ appointment.patient?.gender || '' }}</div>
              </div>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="症状描述" :span="2">
            {{ appointment.symptoms || '无' }}
          </el-descriptions-item>
          <el-descriptions-item label="拒绝原因" v-if="appointment.rejectReason" :span="2">
            <span style="color: #f56c6c;">{{ appointment.rejectReason }}</span>
          </el-descriptions-item>
        </el-descriptions>

        <div class="action-buttons" style="margin-top: 24px;">
          <template v-if="isDoctor">
            <el-button
              v-if="appointment.status === 'PENDING'"
              type="primary"
              :loading="updating"
              @click="handleConfirm"
            >
              确认预约
            </el-button>
            <el-button
              v-if="appointment.status === 'PENDING'"
              type="danger"
              :loading="updating"
              @click="showRejectDialog = true"
            >
              拒绝预约
            </el-button>
            <el-button
              v-if="appointment.status === 'CONFIRMED'"
              type="warning"
              :loading="updating"
              @click="handleStart"
            >
              开始就诊
            </el-button>
          </template>
          <el-button
            v-if="isPatient && ['PENDING', 'CONFIRMED'].includes(appointment.status)"
            type="danger"
            :loading="updating"
            @click="showCancelDialog = true"
          >
            取消预约
          </el-button>
        </div>
      </el-card>

      <el-card class="timeline-card">
        <template #header>
          <span>📊 状态流转</span>
        </template>
        <el-timeline>
          <el-timeline-item
            v-for="item in statusTimeline"
            :key="item.status"
            :type="item.type"
            :timestamp="item.timestamp"
            placement="top"
          >
            <h4>{{ item.title }}</h4>
            <p v-if="item.description">{{ item.description }}</p>
          </el-timeline-item>
        </el-timeline>
      </el-card>

      <el-card
        class="medical-record-card"
        v-if="['IN_PROGRESS', 'COMPLETED'].includes(appointment.status)"
      >
        <template #header>
          <div class="card-header">
            <span>📝 问诊记录</span>
            <el-button
              v-if="isDoctor && appointment.status === 'IN_PROGRESS'"
              type="primary"
              size="small"
              @click="showMedicalRecordDialog = true"
            >
              填写问诊记录
            </el-button>
          </div>
        </template>

        <template v-if="medicalRecord">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="主诉">
              {{ medicalRecord.chiefComplaint || '无' }}
            </el-descriptions-item>
            <el-descriptions-item label="诊断">
              {{ medicalRecord.diagnosis || '无' }}
            </el-descriptions-item>
            <el-descriptions-item label="处方">
              {{ medicalRecord.prescription || '无' }}
            </el-descriptions-item>
            <el-descriptions-item label="医嘱">
              {{ medicalRecord.advice || '无' }}
            </el-descriptions-item>
          </el-descriptions>
        </template>
        <el-empty v-else description="暂无问诊记录" />
      </el-card>

      <el-card
        class="review-card"
        v-if="isPatient && appointment.status === 'COMPLETED'"
      >
        <template #header>
          <span>⭐ 评价</span>
        </template>

        <template v-if="review">
          <div class="review-display">
            <div class="review-rating">
              <el-rate v-model="review.rating" disabled :max="5" :show-text="false" />
              <span style="margin-left: 12px; color: #909399;">{{ review.rating }} 分</span>
            </div>
            <div class="review-comment">{{ review.comment || '无文字评价' }}</div>
            <div class="review-time">{{ formatDate(review.createdAt) }}</div>
          </div>
        </template>

        <template v-else>
          <el-form :model="reviewForm" label-width="80px">
            <el-form-item label="评分">
              <el-rate v-model="reviewForm.rating" :max="5" />
            </el-form-item>
            <el-form-item label="评价">
              <el-input
                v-model="reviewForm.comment"
                type="textarea"
                :rows="4"
                placeholder="请输入您的评价（选填）"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="submittingReview" @click="submitReview">
                提交评价
              </el-button>
            </el-form-item>
          </el-form>
        </template>
      </el-card>
    </template>

    <el-empty v-else description="预约不存在" />

    <el-dialog
      v-model="showRejectDialog"
      title="拒绝预约"
      width="400px"
    >
      <el-form label-width="80px">
        <el-form-item label="拒绝原因">
          <el-input
            v-model="rejectReason"
            type="textarea"
            :rows="3"
            placeholder="请输入拒绝原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRejectDialog = false">取消</el-button>
        <el-button type="danger" :loading="updating" @click="handleReject">
          确认拒绝
        </el-button>
      </template>
    </el-dialog>

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
        <el-button type="danger" :loading="updating" @click="handleCancel">
          确认取消
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showMedicalRecordDialog"
      title="填写问诊记录"
      width="600px"
    >
      <el-form :model="medicalRecordForm" label-width="80px">
        <el-form-item label="主诉">
          <el-input
            v-model="medicalRecordForm.chiefComplaint"
            type="textarea"
            :rows="2"
            placeholder="请输入患者主诉"
          />
        </el-form-item>
        <el-form-item label="诊断">
          <el-input
            v-model="medicalRecordForm.diagnosis"
            type="textarea"
            :rows="2"
            placeholder="请输入诊断结果"
          />
        </el-form-item>
        <el-form-item label="处方">
          <el-input
            v-model="medicalRecordForm.prescription"
            type="textarea"
            :rows="2"
            placeholder="请输入处方信息"
          />
        </el-form-item>
        <el-form-item label="医嘱">
          <el-input
            v-model="medicalRecordForm.advice"
            type="textarea"
            :rows="2"
            placeholder="请输入医嘱"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showMedicalRecordDialog = false">取消</el-button>
        <el-button type="primary" :loading="submittingMedicalRecord" @click="submitMedicalRecord">
          提交并完成就诊
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { appointmentApi, medicalRecordApi, reviewApi } from '@/api'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const userStore = useUserStore()

const appointmentId = computed(() => Number(route.params.id))
const appointment = ref<any>(null)
const medicalRecord = ref<any>(null)
const review = ref<any>(null)
const loading = ref(false)
const updating = ref(false)
const submittingReview = ref(false)
const submittingMedicalRecord = ref(false)

const isDoctor = computed(() => userStore.isDoctor)
const isPatient = computed(() => userStore.isPatient)

const showRejectDialog = ref(false)
const showCancelDialog = ref(false)
const showMedicalRecordDialog = ref(false)
const rejectReason = ref('')
const cancelReason = ref('')

const reviewForm = reactive({
  rating: 5,
  comment: '',
})

const medicalRecordForm = reactive({
  chiefComplaint: '',
  diagnosis: '',
  prescription: '',
  advice: '',
})

const statusTimeline = computed(() => {
  const timeline: any[] = []
  if (!appointment.value) return timeline

  const statusOrder = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED']
  const currentIndex = statusOrder.indexOf(appointment.value.status)

  const statusInfo: Record<string, any> = {
    PENDING: { title: '待确认', type: 'warning', description: '等待医生确认预约' },
    CONFIRMED: { title: '已确认', type: 'primary', description: '医生已确认预约，请按时就诊' },
    IN_PROGRESS: { title: '就诊中', type: 'info', description: '正在进行问诊' },
    COMPLETED: { title: '已完成', type: 'success', description: '问诊已完成' },
    CANCELLED: { title: '已取消', type: 'danger', description: '预约已取消' },
    REJECTED: { title: '已拒绝', type: 'danger', description: '医生已拒绝预约' },
  }

  if (['CANCELLED', 'REJECTED'].includes(appointment.value.status)) {
    timeline.push({
      ...statusInfo[appointment.value.status],
      status: appointment.value.status,
      timestamp: formatDateTime(appointment.value.updatedAt || appointment.value.createdAt),
    })
  } else {
    for (let i = 0; i <= currentIndex; i++) {
      const status = statusOrder[i]
      timeline.push({
        ...statusInfo[status],
        status,
        timestamp: i === currentIndex ? formatDateTime(appointment.value.updatedAt || appointment.value.createdAt) : '',
      })
    }
  }

  return timeline.reverse()
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

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

const handleConfirm = async () => {
  updating.value = true
  try {
    await appointmentApi.updateStatus(appointmentId.value, 'CONFIRMED')
    ElMessage.success('预约已确认')
    fetchAppointment()
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '操作失败')
  } finally {
    updating.value = false
  }
}

const handleReject = async () => {
  updating.value = true
  try {
    await appointmentApi.updateStatus(appointmentId.value, 'REJECTED', rejectReason.value || undefined)
    ElMessage.success('预约已拒绝')
    showRejectDialog.value = false
    fetchAppointment()
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '操作失败')
  } finally {
    updating.value = false
  }
}

const handleStart = async () => {
  updating.value = true
  try {
    await appointmentApi.updateStatus(appointmentId.value, 'IN_PROGRESS')
    ElMessage.success('已开始就诊')
    fetchAppointment()
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '操作失败')
  } finally {
    updating.value = false
  }
}

const handleCancel = async () => {
  updating.value = true
  try {
    await appointmentApi.updateStatus(appointmentId.value, 'CANCELLED', cancelReason.value || undefined)
    ElMessage.success('预约已取消')
    showCancelDialog.value = false
    fetchAppointment()
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '操作失败')
  } finally {
    updating.value = false
  }
}

const submitReview = async () => {
  if (reviewForm.rating <= 0) {
    ElMessage.warning('请选择评分')
    return
  }
  submittingReview.value = true
  try {
    await reviewApi.create({
      appointmentId: appointmentId.value,
      rating: reviewForm.rating,
      comment: reviewForm.comment,
    })
    ElMessage.success('评价提交成功')
    fetchReview()
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '提交失败')
  } finally {
    submittingReview.value = false
  }
}

const submitMedicalRecord = async () => {
  submittingMedicalRecord.value = true
  try {
    await medicalRecordApi.create({
      appointmentId: appointmentId.value,
      ...medicalRecordForm,
    })
    ElMessage.success('问诊记录已提交，就诊已完成')
    showMedicalRecordDialog.value = false
    fetchAppointment()
    fetchMedicalRecord()
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '提交失败')
  } finally {
    submittingMedicalRecord.value = false
  }
}

const fetchAppointment = async () => {
  loading.value = true
  try {
    const res = await appointmentApi.getById(appointmentId.value)
    appointment.value = res.data
  } catch (error) {
    console.error('获取预约详情失败:', error)
  } finally {
    loading.value = false
  }
}

const fetchMedicalRecord = async () => {
  try {
    const res = await medicalRecordApi.getByAppointment(appointmentId.value)
    medicalRecord.value = res.data
  } catch (error) {
    console.error('获取问诊记录失败:', error)
  }
}

const fetchReview = async () => {
  try {
    const res = await reviewApi.getByAppointment(appointmentId.value)
    review.value = res.data
  } catch (error) {
    console.error('获取评价失败:', error)
  }
}

onMounted(() => {
  fetchAppointment()
})
</script>

<style scoped>
.appointment-detail-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.info-card,
.timeline-card,
.medical-record-card,
.review-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.doctor-info-inline {
  display: flex;
  align-items: center;
  gap: 10px;
}

.doctor-info-inline .info .name {
  font-weight: 600;
}

.doctor-info-inline .info .meta {
  font-size: 12px;
  color: #909399;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.loading-center {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

.review-display {
  padding: 16px;
}

.review-rating {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.review-comment {
  color: #606266;
  line-height: 1.6;
  margin-bottom: 8px;
}

.review-time {
  font-size: 12px;
  color: #909399;
}
</style>
