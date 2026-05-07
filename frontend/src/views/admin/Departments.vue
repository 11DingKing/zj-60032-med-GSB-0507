<template>
  <div class="admin-departments-container">
    <el-card class="header-card">
      <template #header>
        <div class="card-header">
          <span class="section-title">🏥 科室管理</span>
          <el-button type="primary" @click="handleCreate">
            <el-icon><Plus /></el-icon>
            新增科室
          </el-button>
        </div>
      </template>
      <p style="color: #606266;">管理医院所有科室信息</p>
    </el-card>

    <el-card>
      <el-table :data="departments" style="width: 100%" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="科室名称" min-width="150">
          <template #default="{ row }">
            <div class="dept-name">
              <span class="dept-icon">{{ getDepartmentIcon(row.name) }}</span>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="科室描述" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.description || '暂无描述' }}
          </template>
        </el-table-column>
        <el-table-column label="医生数量" width="120">
          <template #default="{ row }">
            <el-tag type="primary" effect="light" size="small">
              {{ row._count?.doctors || 0 }} 位
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="100" />
        <el-table-column label="操作" width="180" fixed="right">
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

      <el-empty v-if="departments.length === 0 && !loading" description="暂无科室数据" />
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑科室' : '新增科室'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        :model="form"
        :rules="rules"
        ref="formRef"
        label-width="100px"
      >
        <el-form-item label="科室名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入科室名称" />
        </el-form-item>
        <el-form-item label="科室描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入科室描述（选填）"
          />
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="form.sortOrder" :min="0" :max="999" />
          <span style="color: #909399; font-size: 12px; margin-left: 8px;">数字越小越靠前</span>
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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { departmentApi } from '@/api'

const departments = ref<any[]>([])
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  id: 0,
  name: '',
  description: '',
  sortOrder: 0,
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入科室名称', trigger: 'blur' }],
}

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

const fetchDepartments = async () => {
  loading.value = true
  try {
    const res = await departmentApi.getAll()
    departments.value = res.data || []
  } catch (error) {
    console.error('获取科室列表失败:', error)
  } finally {
    loading.value = false
  }
}

const handleCreate = () => {
  isEdit.value = false
  form.id = 0
  form.name = ''
  form.description = ''
  form.sortOrder = 0
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  isEdit.value = true
  form.id = row.id
  form.name = row.name
  form.description = row.description || ''
  form.sortOrder = row.sortOrder || 0
  dialogVisible.value = true
}

const handleDelete = (row: any) => {
  ElMessageBox.confirm(
    `确定要删除科室「${row.name}」吗？删除后不可恢复！`,
    '删除确认',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(async () => {
      try {
        await departmentApi.delete(row.id)
        ElMessage.success('删除成功')
        fetchDepartments()
      } catch (error: any) {
        ElMessage.error(error.response?.data?.message || '删除失败')
      }
    })
    .catch(() => {})
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        if (isEdit.value) {
          await departmentApi.update(form.id, {
            name: form.name,
            description: form.description,
          })
          ElMessage.success('更新成功')
        } else {
          await departmentApi.create({
            name: form.name,
            description: form.description,
          })
          ElMessage.success('创建成功')
        }
        dialogVisible.value = false
        fetchDepartments()
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
})
</script>

<style scoped>
.admin-departments-container {
  max-width: 1200px;
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

.dept-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dept-icon {
  font-size: 20px;
}
</style>
