<template>
  <div class="permissions-management">
    <div class="toolbar">
      <h3>权限管理</h3>
      <el-button type="primary" :icon="Plus" @click="showCreateDialog">
        授予权限
      </el-button>
    </div>

    <el-table :data="permissions" stripe style="width: 100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="username" label="用户" />
      <el-table-column prop="account_name" label="Steam 账户" />
      <el-table-column prop="granted_at" label="授予时间" width="180" />
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-popconfirm
            title="确定撤销此权限吗？"
            @confirm="revokePermission(row.id)"
          >
            <template #reference>
              <el-button size="small" type="danger">撤销</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      title="授予权限"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="120px"
      >
        <el-form-item label="用户" prop="userId">
          <el-select
            v-model="formData.userId"
            placeholder="请选择用户"
            style="width: 100%"
            filterable
          >
            <el-option
              v-for="user in users"
              :key="user.id"
              :label="user.username"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Steam 账户" prop="steamAccountId">
          <el-select
            v-model="formData.steamAccountId"
            placeholder="请选择 Steam 账户"
            style="width: 100%"
            filterable
          >
            <el-option
              v-for="account in accounts"
              :key="account.id"
              :label="account.account_name"
              :value="account.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import axios from '@/utils/axios'

const permissions = ref([])
const users = ref([])
const accounts = ref([])
const dialogVisible = ref(false)
const formRef = ref(null)
const formData = ref({
  userId: null,
  steamAccountId: null
})

const rules = {
  userId: [
    { required: true, message: '请选择用户', trigger: 'change' }
  ],
  steamAccountId: [
    { required: true, message: '请选择 Steam 账户', trigger: 'change' }
  ]
}

const fetchPermissions = async () => {
  try {
    const response = await axios.get('/api/admin/permissions')
    permissions.value = response.data.permissions
  } catch (error) {
    console.error('Failed to fetch permissions:', error)
  }
}

const fetchUsers = async () => {
  try {
    const response = await axios.get('/api/admin/users')
    users.value = response.data.users.filter(u => u.role !== 'admin')
  } catch (error) {
    console.error('Failed to fetch users:', error)
  }
}

const fetchAccounts = async () => {
  try {
    const response = await axios.get('/api/admin/steam-accounts')
    accounts.value = response.data.accounts
  } catch (error) {
    console.error('Failed to fetch accounts:', error)
  }
}

const showCreateDialog = () => {
  formData.value = {
    userId: null,
    steamAccountId: null
  }
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    
    try {
      await axios.post('/api/admin/permissions', formData.value)
      ElMessage.success('权限授予成功')
      dialogVisible.value = false
      fetchPermissions()
    } catch (error) {
      console.error('Failed to grant permission:', error)
    }
  })
}

const revokePermission = async (permissionId) => {
  try {
    await axios.delete(`/api/admin/permissions/${permissionId}`)
    ElMessage.success('权限撤销成功')
    fetchPermissions()
  } catch (error) {
    console.error('Failed to revoke permission:', error)
  }
}

onMounted(() => {
  fetchPermissions()
  fetchUsers()
  fetchAccounts()
})
</script>

<style scoped>
.permissions-management {
  padding: 20px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.toolbar h3 {
  margin: 0;
}
</style>
