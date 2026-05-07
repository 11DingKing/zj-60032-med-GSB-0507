<template>
  <div class="doctors-container">
    <el-card class="filter-card">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-select
            v-model="selectedDepartment"
            placeholder="选择科室"
            clearable
            style="width: 100%"
            @change="fetchDoctors"
          >
            <el-option
              v-for="dept in departments"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
        </el-col>
        <el-col :span="12">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索医生姓名、擅长领域..."
            clearable
            @keyup.enter="fetchDoctors"
            @clear="fetchDoctors"
          >
            <template #append>
              <el-button @click="fetchDoctors">搜索</el-button>
            </template>
          </el-input>
        </el-col>
        <el-col :span="6">
          <el-select v-model="sortBy" placeholder="排序方式" style="width: 100%" @change="fetchDoctors">
            <el-option label="默认排序" value="default" />
            <el-option label="评分最高" value="rating" />
            <el-option label="评价最多" value="reviewCount" />
          </el-select>
        </el-col>
      </el-row>
    </el-card>

    <el-row :gutter="20">
      <el-col :xs="24" :sm="12" :md="8" :lg="6" v-for="doctor in doctors" :key="doctor.id">
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

    <el-empty v-if="doctors.length === 0 && !loading" description="暂无医生数据" />

    <div v-if="loading" class="loading-center">
      <i class="el-icon-loading" style="font-size: 32px;"></i>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { doctorApi, departmentApi } from '@/api'

const router = useRouter()
const route = useRoute()

const departments = ref<any[]>([])
const doctors = ref<any[]>([])
const loading = ref(false)
const selectedDepartment = ref<number | undefined>()
const searchKeyword = ref('')
const sortBy = ref('default')

const goDoctor = (id: number) => {
  router.push(`/doctor/${id}`)
}

const fetchDepartments = async () => {
  try {
    const res = await departmentApi.getAll()
    departments.value = res.data
  } catch (error) {
    console.error('获取科室列表失败:', error)
  }
}

const fetchDoctors = async () => {
  loading.value = true
  try {
    const params: any = {}
    if (selectedDepartment.value) params.departmentId = selectedDepartment.value
    if (searchKeyword.value) params.keyword = searchKeyword.value
    
    const res = await doctorApi.getAll(params)
    let list = res.data
    
    if (sortBy.value === 'rating') {
      list.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
    } else if (sortBy.value === 'reviewCount') {
      list.sort((a: any, b: any) => (b.reviewCount || 0) - (a.reviewCount || 0))
    }
    
    doctors.value = list
  } catch (error) {
    console.error('获取医生列表失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDepartments()
  if (route.query.departmentId) {
    selectedDepartment.value = Number(route.query.departmentId)
  }
  if (route.query.keyword) {
    searchKeyword.value = route.query.keyword as string
  }
  fetchDoctors()
})
</script>
