<template>
  <div class="doctor-detail-container">
    <el-card v-if="doctor" class="doctor-info-card">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-avatar :size="120" :src="doctor.avatar || doctor.user?.avatar">
            {{ (doctor.user?.realName || doctor.id).charAt(0) }}
          </el-avatar>
        </el-col>
        <el-col :span="18">
          <h2 class="doctor-name">{{ doctor.user?.realName }}</h2>
          <div class="doctor-meta">
            <el-tag type="primary" size="large">{{ doctor.title }}</el-tag>
            <span class="meta-item">🏥 {{ doctor.department?.name }}</span>
          </div>
          <div class="doctor-rating-large">
            <el-rate v-model="doctor.rating" disabled :max="5" :show-text="false" />
            <span style="margin-left: 12px; font-size: 16px;">{{ doctor.rating?.toFixed(1) || '暂无' }} 分</span>
            <span style="margin-left: 12px; color: #909399;">{{ doctor.reviewCount }} 条评价</span>
          </div>
          <div class="doctor-specialty-large">
            <strong>擅长：</strong>{{ doctor.specialty }}
          </div>
          <div class="doctor-intro">
            <strong>简介：</strong>{{ doctor.bio || '暂无简介' }}
          </div>
        </el-col>
      </el-row>
    </el-card>

    <el-card class="schedule-card" v-if="doctor">
      <template #header>
        <div class="card-header">
          <span>📅 可预约排班</span>
          <el-button-group>
            <el-button size="small" @click="previousWeek">上一周</el-button>
            <el-button size="small" @click="nextWeek">下一周</el-button>
          </el-button-group>
        </div>
      </template>

      <div class="week-display">
        {{ weekDisplay }}
      </div>

      <el-tabs v-model="activeDay">
        <el-tab-pane
          v-for="(day, index) in weekDays"
          :key="index"
          :label="day.name"
          :name="day.date"
        >
          <div v-if="getDaySlots(day.date).length === 0" class="no-slots">
            该日期暂无排班
          </div>
          <div v-else class="slots-grid">
            <div
              v-for="slot in getDaySlots(day.date)"
              :key="slot.id"
              class="slot-item"
              :class="{
                'slot-available': slot.availableCount > 0,
                'slot-unavailable': slot.availableCount === 0,
              }"
              @click="slot.availableCount > 0 && selectSlot(slot)"
            >
              <div class="slot-time">{{ slot.startTime }} - {{ slot.endTime }}</div>
              <div class="slot-status">
                <span v-if="slot.availableCount > 0" class="slot-available-text">
                  剩余 {{ slot.availableCount }} 个号
                </span>
                <span v-else class="slot-unavailable-text">
                  已约满
                </span>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-card class="review-form-card" v-if="showReviewForm">
      <template #header>
        <div class="card-header">
          <span>✍️ 提交评价</span>
          <el-button link type="info" @click="showReviewForm = false">
            收起
          </el-button>
        </div>
      </template>

      <el-alert
        v-if="completedAppointmentsWithoutReview.length === 0"
        title="您没有与该医生的已完成预约可以评价"
        type="info"
        show-icon
        :closable="false"
      />

      <template v-else>
        <el-form :model="reviewForm" label-width="100px">
          <el-form-item label="选择预约">
            <el-select
              v-model="reviewForm.selectedAppointmentId"
              placeholder="请选择要评价的预约"
              style="width: 100%"
            >
              <el-option
                v-for="apt in completedAppointmentsWithoutReview"
                :key="apt.id"
                :label="`${formatAppointmentDate(apt.appointmentDate)} ${apt.startTime}`"
                :value="apt.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="评分">
            <el-rate v-model="reviewForm.rating" :max="5" :texts="ratingTexts" show-text />
          </el-form-item>
          <el-form-item label="评价内容">
            <el-input
              v-model="reviewForm.comment"
              type="textarea"
              :rows="4"
              placeholder="请输入您的评价（选填），分享您的就诊体验..."
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="submittingReview" @click="submitReviewForDoctor">
              提交评价
            </el-button>
            <el-button @click="showReviewForm = false">取消</el-button>
          </el-form-item>
        </el-form>
      </template>
    </el-card>

    <el-card class="reviews-card">
      <template #header>
        <div class="card-header">
          <span>⭐ 患者评价 ({{ reviews.length }})</span>
          <el-button
            v-if="canSubmitReview"
            type="primary"
            size="small"
            @click="showReviewForm = !showReviewForm"
          >
            {{ showReviewForm ? '收起评价' : '写评价' }}
          </el-button>
        </div>
      </template>

      <div v-if="reviews.length === 0" class="no-reviews">
        暂无评价
      </div>

      <div v-else class="reviews-list">
        <div v-for="review in reviews" :key="review.id" class="review-item">
          <div class="review-header">
            <el-avatar :size="36">
              {{ review.patient?.user?.realName?.charAt(0) || '患' }}
            </el-avatar>
            <div class="reviewer-info">
              <div class="reviewer-name">{{ review.patient?.user?.realName || '患者' }}</div>
              <el-rate v-model="review.rating" disabled :max="5" :show-text="false" size="small" />
            </div>
            <div class="review-date">
              {{ formatDate(review.createdAt) }}
            </div>
          </div>
          <div class="review-content">{{ review.comment || '无文字评价' }}</div>
        </div>
      </div>
    </el-card>

    <el-dialog
      v-model="showAppointmentDialog"
      title="预约确认"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="appointmentForm" label-width="100px">
        <el-form-item label="医生">
          <el-input :value="doctor?.user?.realName" disabled />
        </el-form-item>
        <el-form-item label="科室">
          <el-input :value="doctor?.department?.name" disabled />
        </el-form-item>
        <el-form-item label="预约日期">
          <el-input :value="selectedSlot?.date" disabled />
        </el-form-item>
        <el-form-item label="预约时段">
          <el-input :value="`${selectedSlot?.startTime} - ${selectedSlot?.endTime}`" disabled />
        </el-form-item>
        <el-form-item label="症状描述">
          <el-input
            v-model="appointmentForm.symptoms"
            type="textarea"
            :rows="4"
            placeholder="请描述您的症状（选填）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAppointmentDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitAppointment">
          确认预约
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { doctorApi, scheduleApi, reviewApi, appointmentApi } from '@/api'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const doctorId = computed(() => Number(route.params.id))
const doctor = ref<any>(null)
const schedules = ref<any[]>([])
const reviews = ref<any[]>([])

const currentWeekOffset = ref(0)
const activeDay = ref('')

const showAppointmentDialog = ref(false)
const selectedSlot = ref<any>(null)
const submitting = ref(false)
const appointmentForm = reactive({
  symptoms: '',
})

const showReviewForm = ref(false)
const submittingReview = ref(false)
const myAppointments = ref<any[]>([])
const reviewForm = reactive({
  selectedAppointmentId: null as number | null,
  rating: 5,
  comment: '',
})

const ratingTexts = ['极差', '失望', '一般', '满意', '惊喜']

const canSubmitReview = computed(() => {
  return userStore.isLoggedIn && userStore.isPatient
})

const completedAppointmentsWithoutReview = computed(() => {
  return myAppointments.value.filter((apt: any) => {
    return (
      apt.status === 'COMPLETED' &&
      apt.doctorId === doctorId.value &&
      !apt.review
    )
  })
})

const weekDays = computed(() => {
  const days = []
  const today = new Date()
  const startOfWeek = new Date(today)
  
  const dayOfWeek = today.getDay()
  startOfWeek.setDate(today.getDate() - dayOfWeek + 1 + currentWeekOffset.value * 7)
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + i)
    const dateStr = formatDateStr(date)
    days.push({
      name: getDayName(i),
      date: dateStr,
      isToday: i === dayOfWeek - 1 && currentWeekOffset.value === 0,
    })
  }
  return days
})

const weekDisplay = computed(() => {
  if (weekDays.value.length > 0) {
    return `${weekDays.value[0].date} ~ ${weekDays.value[6].date}`
  }
  return ''
})

const formatDateStr = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getDayName = (index: number) => {
  const names = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  return names[index]
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

const formatAppointmentDate = (dateValue: any) => {
  if (!dateValue) return ''
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue)
  return date.toISOString().split('T')[0]
}

const getDaySlots = (date: string) => {
  const daySlots = schedules.value
    .filter((s: any) => s.date === date && s.slots)
    .flatMap((s: any) => s.slots)
  return daySlots || []
}

const previousWeek = () => {
  currentWeekOffset.value--
}

const nextWeek = () => {
  currentWeekOffset.value++
}

const selectSlot = (slot: any) => {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  if (!userStore.isPatient) {
    ElMessage.warning('只有患者可以预约')
    return
  }
  selectedSlot.value = slot
  showAppointmentDialog.value = true
}

const submitAppointment = async () => {
  if (!selectedSlot.value) return
  submitting.value = true
  try {
    await appointmentApi.create({
      doctorId: doctorId.value,
      scheduleId: selectedSlot.value.scheduleId,
      appointmentDate: selectedSlot.value.date,
      startTime: selectedSlot.value.startTime,
      endTime: selectedSlot.value.endTime,
      symptoms: appointmentForm.symptoms,
    })
    ElMessage.success('预约成功！')
    showAppointmentDialog.value = false
    fetchSchedules()
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '预约失败')
  } finally {
    submitting.value = false
  }
}

const fetchDoctor = async () => {
  try {
    const res = await doctorApi.getById(doctorId.value)
    doctor.value = res.data
  } catch (error) {
    console.error('获取医生信息失败:', error)
  }
}

const fetchSchedules = async () => {
  try {
    const startDate = weekDays.value[0]?.date
    const endDate = weekDays.value[6]?.date
    const res = await scheduleApi.getByDoctor(doctorId.value, startDate, endDate)
    schedules.value = res.data
    if (weekDays.value.length > 0 && !activeDay.value) {
      activeDay.value = weekDays.value.find((d) => d.isToday)?.date || weekDays.value[0].date
    }
  } catch (error) {
    console.error('获取排班失败:', error)
  }
}

const fetchReviews = async () => {
  try {
    const res = await reviewApi.getByDoctor(doctorId.value)
    reviews.value = res.data
  } catch (error) {
    console.error('获取评价失败:', error)
  }
}

const fetchMyAppointments = async () => {
  if (!userStore.isPatient) return
  try {
    const res = await appointmentApi.getMy()
    myAppointments.value = res.data || []
  } catch (error) {
    console.error('获取我的预约失败:', error)
  }
}

const submitReviewForDoctor = async () => {
  if (!reviewForm.selectedAppointmentId) {
    ElMessage.warning('请选择要评价的预约')
    return
  }
  if (reviewForm.rating <= 0) {
    ElMessage.warning('请选择评分')
    return
  }
  submittingReview.value = true
  try {
    await reviewApi.create({
      appointmentId: reviewForm.selectedAppointmentId,
      rating: reviewForm.rating,
      comment: reviewForm.comment,
    })
    ElMessage.success('评价提交成功！')
    showReviewForm.value = false
    reviewForm.selectedAppointmentId = null
    reviewForm.rating = 5
    reviewForm.comment = ''
    fetchReviews()
    fetchMyAppointments()
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '提交失败')
  } finally {
    submittingReview.value = false
  }
}

onMounted(() => {
  fetchDoctor()
  fetchReviews()
  fetchMyAppointments()
})
</script>
