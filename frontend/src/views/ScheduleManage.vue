<template>
  <div class="schedule-manage-container">
    <el-card class="intro-card">
      <template #header>
        <div class="card-header">
          <span class="section-title">📅 排班管理</span>
          <el-button-group>
            <el-button size="small" @click="previousWeek">上一周</el-button>
            <el-button size="small" @click="nextWeek">下一周</el-button>
            <el-button
              type="primary"
              size="small"
              :loading="saving"
              @click="saveSchedule"
            >
              保存排班
            </el-button>
            <el-button
              type="success"
              size="small"
              :loading="copying"
              @click="showCopyDialog = true"
            >
              复制到下一周
            </el-button>
          </el-button-group>
        </div>
      </template>
      <div class="week-display">
        <span class="week-range">{{ weekRange }}</span>
        <el-tag v-if="isCurrentWeek" type="primary" effect="light">本周</el-tag>
      </div>
    </el-card>

    <div class="schedule-grid" v-if="loading">
      <div class="loading-center">
        <i class="el-icon-loading" style="font-size: 32px;"></i>
      </div>
    </div>

    <div class="schedule-grid" v-else>
      <div class="time-header">
        <div class="time-label">时间</div>
        <div
          v-for="(day, index) in weekDays"
          :key="index"
          class="day-header"
          :class="{ 'today-header': day.isToday }"
        >
          <div class="day-name">{{ day.name }}</div>
          <div class="day-date">{{ day.date }}</div>
        </div>
      </div>

      <div class="time-slots">
        <div
          v-for="(slot, slotIndex) in timeSlots"
          :key="slotIndex"
          class="slot-row"
        >
          <div class="time-label">{{ slot.start }} - {{ slot.end }}</div>
          <div
            v-for="(day, dayIndex) in weekDays"
            :key="dayIndex"
            class="slot-cell"
            :class="{
              'slot-enabled': isSlotEnabled(dayIndex, slotIndex),
              'today-cell': day.isToday,
            }"
            @click="toggleSlot(dayIndex, slotIndex)"
          >
            <template v-if="isSlotEnabled(dayIndex, slotIndex)">
              <div class="slot-max-count">
                <el-input-number
                  v-model="scheduleData[dayIndex].slots[slotIndex].maxCount"
                  :min="1"
                  :max="20"
                  size="small"
                  controls-position="right"
                  @click.stop
                />
                <span class="count-label">个号</span>
              </div>
              <el-button
                type="danger"
                link
                size="small"
                @click.stop="removeSlot(dayIndex, slotIndex)"
              >
                移除
              </el-button>
            </template>
            <template v-else>
              <el-icon class="add-icon"><Plus /></el-icon>
              <span class="add-text">添加</span>
            </template>
          </div>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="showCopyDialog"
      title="复制排班到下一周"
      width="500px"
    >
      <p>选择要复制的星期几排班到下一周：</p>
      <el-checkbox-group v-model="selectedDaysToCopy" style="margin-top: 16px;">
        <el-checkbox
          v-for="(day, index) in weekDays"
          :key="index"
          :label="index"
          :disabled="!hasScheduleForDay(index)"
        >
          {{ day.name }} ({{ day.date }})
          <span v-if="!hasScheduleForDay(index)" style="color: #c0c4cc;">（无排班）</span>
        </el-checkbox>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="showCopyDialog = false">取消</el-button>
        <el-button type="primary" :loading="copying" @click="copyToNextWeek">
          确认复制
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { scheduleApi } from '@/api'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const loading = ref(false)
const saving = ref(false)
const copying = ref(false)
const weekOffset = ref(0)
const showCopyDialog = ref(false)
const selectedDaysToCopy = ref<number[]>([])

const weekDaysNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const timeSlots = computed(() => {
  const slots = []
  for (let hour = 8; hour < 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const start = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      const endMinute = minute + 30
      const endHour = endMinute >= 60 ? hour + 1 : hour
      const end = `${String(endHour).padStart(2, '0')}:${String(endMinute % 60).padStart(2, '0')}`
      slots.push({ start, end })
    }
  }
  return slots
})

const weekDays = computed(() => {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() + mondayOffset + weekOffset.value * 7)

  const days = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + i)
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const isToday = weekOffset.value === 0 && i === (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
    days.push({
      name: weekDaysNames[i],
      date: dateStr,
      isToday,
      dateObj: date,
    })
  }
  return days
})

const weekRange = computed(() => {
  if (weekDays.value.length > 0) {
    return `${weekDays.value[0].date} ~ ${weekDays.value[6].date}`
  }
  return ''
})

const isCurrentWeek = computed(() => weekOffset.value === 0)

const doctorId = computed(() => userStore.user?.doctorId)

interface SlotData {
  enabled: boolean
  maxCount: number
  startTime: string
  endTime: string
}

interface DaySchedule {
  date: string
  slots: SlotData[]
}

const scheduleData = ref<DaySchedule[]>([])

const initScheduleData = () => {
  scheduleData.value = weekDays.value.map((day) => ({
    date: day.date,
    slots: timeSlots.value.map((slot) => ({
      enabled: false,
      maxCount: 5,
      startTime: slot.start,
      endTime: slot.end,
    })),
  }))
}

const isSlotEnabled = (dayIndex: number, slotIndex: number) => {
  return scheduleData.value[dayIndex]?.slots[slotIndex]?.enabled || false
}

const toggleSlot = (dayIndex: number, slotIndex: number) => {
  if (scheduleData.value[dayIndex]?.slots[slotIndex]) {
    scheduleData.value[dayIndex].slots[slotIndex].enabled =
      !scheduleData.value[dayIndex].slots[slotIndex].enabled
  }
}

const removeSlot = (dayIndex: number, slotIndex: number) => {
  if (scheduleData.value[dayIndex]?.slots[slotIndex]) {
    scheduleData.value[dayIndex].slots[slotIndex].enabled = false
    scheduleData.value[dayIndex].slots[slotIndex].maxCount = 5
  }
}

const hasScheduleForDay = (dayIndex: number) => {
  return scheduleData.value[dayIndex]?.slots?.some((s) => s.enabled) || false
}

const previousWeek = () => {
  weekOffset.value--
}

const nextWeek = () => {
  weekOffset.value++
}

const dateToWeekDay = (dateStr: string): number => {
  const date = new Date(dateStr)
  const dayOfWeek = date.getDay()
  return dayOfWeek === 0 ? 7 : dayOfWeek
}

const weekDayToDayIndex = (weekDay: number): number => {
  return weekDay === 7 ? 6 : weekDay - 1
}

const fetchSchedule = async () => {
  if (!doctorId.value) return
  loading.value = true
  initScheduleData()
  try {
    const res = await scheduleApi.getByDoctor(doctorId.value)
    const existingSchedules = res.data || []
    
    existingSchedules.forEach((sched: any) => {
      const dayIndex = weekDayToDayIndex(sched.weekDay)
      if (dayIndex >= 0 && dayIndex < 7) {
        const slotIndex = timeSlots.value.findIndex(
          (ts) => ts.start === sched.startTime
        )
        if (slotIndex !== -1) {
          scheduleData.value[dayIndex].slots[slotIndex].enabled = true
          scheduleData.value[dayIndex].slots[slotIndex].maxCount =
            sched.maxAppointments || 5
        }
      }
    })
  } catch (error) {
    console.error('获取排班失败:', error)
  } finally {
    loading.value = false
  }
}

const saveSchedule = async () => {
  if (!doctorId.value) return
  saving.value = true
  try {
    const schedulesToSave: any[] = []
    scheduleData.value.forEach((day, dayIndex) => {
      const weekDay = dayIndex + 1
      day.slots
        .filter((s) => s.enabled)
        .forEach((s) => {
          schedulesToSave.push({
            weekDay,
            startTime: s.startTime,
            endTime: s.endTime,
            maxAppointments: s.maxCount,
          })
        })
    })

    await scheduleApi.batchCreate(doctorId.value, schedulesToSave)
    ElMessage.success('排班保存成功')
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const copyToNextWeek = async () => {
  if (!doctorId.value || selectedDaysToCopy.value.length === 0) {
    ElMessage.warning('请选择要复制的日期')
    return
  }
  copying.value = true
  try {
    await scheduleApi.copyToNextWeek(doctorId.value, selectedDaysToCopy.value)
    ElMessage.success('已复制到下一周')
    showCopyDialog.value = false
    selectedDaysToCopy.value = []
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '复制失败')
  } finally {
    copying.value = false
  }
}

watch(
  () => weekOffset.value,
  () => {
    fetchSchedule()
  }
)

onMounted(() => {
  initScheduleData()
  fetchSchedule()
})
</script>

<style scoped>
.schedule-manage-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.intro-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.week-display {
  display: flex;
  align-items: center;
  gap: 12px;
}

.week-range {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.schedule-grid {
  background-color: #fff;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #ebeef5;
}

.time-header {
  display: grid;
  grid-template-columns: 100px repeat(7, 1fr);
  background-color: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
}

.time-label {
  padding: 16px;
  text-align: center;
  font-weight: 600;
  color: #606266;
  border-right: 1px solid #ebeef5;
}

.day-header {
  padding: 16px 8px;
  text-align: center;
  border-right: 1px solid #ebeef5;
}

.day-header:last-child {
  border-right: none;
}

.today-header {
  background-color: #ecf5ff;
}

.day-name {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}

.day-date {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.time-slots {
  display: flex;
  flex-direction: column;
}

.slot-row {
  display: grid;
  grid-template-columns: 100px repeat(7, 1fr);
  border-bottom: 1px solid #ebeef5;
}

.slot-row:last-child {
  border-bottom: none;
}

.slot-cell {
  min-height: 80px;
  border-right: 1px solid #ebeef5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 8px;
}

.slot-cell:last-child {
  border-right: none;
}

.slot-cell:hover {
  background-color: #f5f7fa;
}

.slot-enabled {
  background-color: #f0f9eb;
}

.slot-enabled:hover {
  background-color: #e1f3d8;
}

.today-cell {
  background-color: #ecf5ff;
}

.today-cell.slot-enabled {
  background-color: #d9ecff;
}

.add-icon {
  font-size: 20px;
  color: #c0c4cc;
}

.add-text {
  font-size: 12px;
  color: #c0c4cc;
  margin-top: 4px;
}

.slot-max-count {
  display: flex;
  align-items: center;
  gap: 4px;
}

.count-label {
  font-size: 12px;
  color: #606266;
}

.loading-center {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}
</style>
