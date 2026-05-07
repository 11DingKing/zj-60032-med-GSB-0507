<template>
  <div class="admin-doctors-container">
    <el-card class="header-card">
      <template #header>
        <div class="card-header">
          <span class="section-title">👨‍⚕️ 医生管理</span>
          <el-button type="primary" @click="handleCreate">
            <el-icon><Plus /></el-icon>
            新增医生
          </el-button>
        </div>
      </template>

      <el-form :inline="true" :model="searchForm" style="margin-top: 16px;">
        <el-form-item label="科室">
          <el-select
            v-model="searchForm.departmentId"
            placeholder="选择科室"
            clearable
            style="width: 180px"
          >
            <el-option
              v-for="dept in departments"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="搜索">
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索医生姓名、职称、擅长领域"
            clearable
            style="width: 240px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card>
      <el-table :data="doctors" style="width: 100%" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="医生信息" min-width="200">
          <template #default="{ row }">
            <div class="doctor-info-cell">
              <el-avatar :size="48" :src="row.avatar || row.user?.avatar">
                {{ (row.user?.realName || '医').charAt(0) }}
              </el-avatar>
              <div class="info">
                <div class="name">{{ row.user?.realName }}</div>
                <div class="meta">
                  <el-tag type="primary" size="small">{{ row.title }}</el-tag>
                  <span class="dept-name">{{ row.department?.name }}</span>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="specialty" label="擅长领域" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.specialty || '暂无' }}
          </template>
        </el-table-column>
        <el-table-column label="评分" width="120">
          <template #default="{ row }">
            <div class="rating-cell">
              <el-rate
                v-model="row.rating"
                disabled
                :max="5"
                :show-text="false"
                size="small"
              />
              <span class="rating-text">{{ row.rating?.toFixed(1) || '暂无' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="评价数" width="100">
          <template #default="{ row }">
            <el-tag type="success" size="small" effect="light">
              {{ row.reviewCount || 0 }} 条
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="登录账号" width="120">
          <template #default="{ row }">
            {{ row.user?.username || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'" effect="light" size="small">
              {{ row.isActive ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="doctors.length === 0 && !loading" description="暂无医生数据" />
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑医生' : '新增医生'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        :model="form"
        :rules="rules"
        ref="formRef"
        label-width="100px"
        :label-position="'right'"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="用户名" prop="username" v-if="!isEdit">
              <el-input v-model="form.username" placeholder="请输入登录用户名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="密码" prop="password" v-if="!isEdit">
              <el-input v-model="form.password" type="password" placeholder="请输入登录密码" show-password />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="姓名" prop="realName">
              <el-input v-model="form.realName" placeholder="请输入医生姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="职称" prop="title">
              <el-select v-model="form.title" placeholder="请选择职称" style="width: 100%">
                <el-option label="主任医师" value="主任医师" />
                <el-option label="副主任医师" value="副主任医师" />
                <el-option label="主治医师" value="主治医师" />
                <el-option label="医师" value="医师" />
                <el-option label="住院医师" value="住院医师" />
                <el-option label="实习医师" value="实习医师" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="所属科室" prop="departmentId">
              <el-select v-model="form.departmentId" placeholder="请选择科室" style="width: 100%">
                <el-option
                  v-for="dept in departments"
                  :key="dept.id"
                  :label="dept.name"
                  :value="dept.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="form.phone" placeholder="请输入手机号" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="擅长领域" prop="specialty">
          <el-input v-model="form.specialty" placeholder="请输入擅长领域，多个用逗号分隔" />
        </el-form-item>

        <el-form-item label="个人简介" prop="introduction">
          <el-input
            v-model="form.introduction"
            type="textarea"
            :rows="3"
            placeholder="请输入医生个人简介"
          />
        </el-form-item>

        <el-form-item label="头像URL" prop="avatar">
          <el-input v-model="form.avatar" placeholder="请输入头像图片URL（选填）" />
        </el-form-item>

        <el-form-item label="状态" prop="isActive" v-if="isEdit">
          <el-switch v-model="form.isActive" active-text="正常" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { doctorApi, departmentApi } from '@/api'

const doctors = ref<any[]>([])
const departments = ref<any[]>([])
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref<FormInstance>()

const searchForm = reactive({
  departmentId: undefined as number | undefined,
  keyword: '',
})

const form = reactive({
  id: 0,
  username: '',
  password: '',
  realName: '',
  departmentId: undefined as number | undefined,
  title: '',
  specialty: '',
  introduction: '',
  avatar: '',
  phone: '',
  isActive: true,
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' },
  ],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  departmentId: [{ required: true, message: '请选择科室', trigger: 'change' }],
  title: [{ required: true, message: '请选择职称', trigger: 'change' }],
  specialty: [{ required: true, message: '请输入擅长领域', trigger: 'blur' }],
}

const fetchDepartments = async () => {
  try {
    const res = await departmentApi.getAll()
    departments.value = res.data || []
  } catch (error) {
    console.error('获取科室列表失败:', error)
  }
}

const fetchDoctors = async () => {
  loading.value = true
  try {
    const params: any = {}
    if (searchForm.departmentId) params.departmentId = searchForm.departmentId
    if (searchForm.keyword) params.keyword = searchForm.keyword
    const res = await doctorApi.getAll(params)
    doctors.value = res.data || []
  } catch (error) {
    console.error('获取医生列表失败:', error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  fetchDoctors()
}

const handleReset = () => {
  searchForm.departmentId = undefined
  searchForm.keyword = ''
  fetchDoctors()
}

const handleCreate = () => {
  isEdit.value = false
  form.id = 0
  form.username = ''
  form.password = ''
  form.realName = ''
  form.departmentId = undefined
  form.title = ''
  form.specialty = ''
  form.introduction = ''
  form.avatar = ''
  form.phone = ''
  form.isActive = true
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  isEdit.value = true
  form.id = row.id
  form.username = row.user?.username || ''
  form.password = ''
  form.realName = row.user?.realName || ''
  form.departmentId = row.departmentId
  form.title = row.title
  form.specialty = row.specialty || ''
  form.introduction = row.introduction || row.bio || ''
  form.avatar = row.avatar || ''
  form.phone = row.phone || ''
  form.isActive = row.isActive !== false
  dialogVisible.value = true
}

const handleDelete = (row: any) => {
  ElMessageBox.confirm(
    `确定要删除医生「${row.user?.realName}」吗？删除后不可恢复！`,
    '删除确认',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(async () => {
      try {
        await doctorApi.delete(row.id)
        ElMessage.success('删除成功')
        fetchDoctors()
      } catch (error: any) {
        ElMessage.error(error.response?.data?.message || '删除失败')
      }
    })
    .catch(() => {})
}

const handleSubmit = async () => {
  if (!formRef.value) return
  const validFields = isEdit.value
    ? ['realName', 'departmentId', 'title', 'specialty']
    : ['username', 'password', 'realName', 'departmentId', 'title', 'specialty']

  await formRef.value.validateField(validFields, async (valid) => {
    if (!valid) {
      submitting.value = true
      try {
        const data: any = {
          realName: form.realName,
          departmentId: form.departmentId,
          title: form.title,
          specialty: form.specialty,
          introduction: form.introduction,
          avatar: form.avatar || undefined,
          phone: form.phone || undefined,
        }

        if (isEdit.value) {
          data.isActive = form.isActive
          await doctorApi.update(form.id, data)
          ElMessage.success('更新成功')
        } else {
          data.username = form.username
          data.password = form.password
          await doctorApi.create(data)
          ElMessage.success('创建成功')
        }
        dialogVisible.value = false
        fetchDoctors()
      } catch (error: any) {
        ElMessage.error(error.response?.data?.message || '操作失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

onMounted(() => {
  fetchDepartments()
  fetchDoctors()
})
</script>

<style scoped>
.admin-doctors-container {
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

.doctor-info-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.doctor-info-cell .info .name {
  font-weight: 600;
  font-size: 15px;
  color: #303133;
  margin-bottom: 4px;
}

.doctor-info-cell .info .meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.doctor-info-cell .info .meta .dept-name {
  font-size: 12px;
  color: #909399;
}

.rating-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.rating-text {
  font-size: 12px;
  color: #909399;
}
</style>
