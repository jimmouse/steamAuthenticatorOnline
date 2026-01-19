<template>
  <div class="users-management">
    <div class="toolbar">
      <h3>用户管理</h3>
      <el-button type="primary" :icon="Plus" @click="showCreateDialog">
        创建用户
      </el-button>
    </div>

    <el-table :data="users" stripe style="width: 100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="username" label="用户名" />
      <el-table-column prop="role" label="角色" width="120">
        <template #default="{ row }">
          <el-tag :type="row.role === 'admin' ? 'danger' : 'primary'">
            {{ row.role === 'admin' ? '管理员' : '用户' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="180" />
      <el-table-column prop="last_login" label="最后登录" width="180" />
      <el-table-column prop="last_ip" label="最后IP" width="150" />
      <el-table-column prop="is_active" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.is_active ? 'success' : 'info'">
            {{ row.is_active ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="showEditDialog(row)">编辑</el-button>
          <el-popconfirm
            title="确定删除此用户吗？"
            @confirm="deleteUser(row.id)"
          >
            <template #reference>
              <el-button size="small" type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '创建用户' : '编辑用户'"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="formData.username" :disabled="dialogMode === 'edit'" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="formData.password"
            type="password"
            :placeholder="dialogMode === 'edit' ? '留空则不修改' : '请输入密码'"
          />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="formData.role" style="width: 100%">
            <el-option label="用户" value="user" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="dialogMode === 'edit'" label="状态" prop="is_active">
          <el-switch v-model="formData.is_active" />
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

const users = ref([])
const dialogVisible = ref(false)
const dialogMode = ref('create')
const formRef = ref(null)
const formData = ref({
  id: null,
  username: '',
  password: '',
  role: 'user',
  is_active: true
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur', validator: (rule, value, callback) => {
      if (dialogMode.value === 'create' && !value) {
        callback(new Error('请输入密码'))
      } else {
        callback()
      }
    }}
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ]
}

const fetchUsers = async () => {
  try {
    const response = await axios.get('/api/admin/users')
    users.value = response.data.users
  } catch (error) {
    console.error('Failed to fetch users:', error)
  }
}

const showCreateDialog = () => {
  dialogMode.value = 'create'
  formData.value = {
    id: null,
    username: '',
    password: '',
    role: 'user',
    is_active: true
  }
  dialogVisible.value = true
}

const showEditDialog = (user) => {
  dialogMode.value = 'edit'
  formData.value = {
    id: user.id,
    username: user.username,
    password: '',
    role: user.role,
    is_active: user.is_active === 1
  }
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    
    try {
      if (dialogMode.value === 'create') {
        await axios.post('/api/admin/users', formData.value)
        ElMessage.success('用户创建成功')
      } else {
        const data = { ...formData.value }
        if (!data.password) {
          delete data.password
        }
        await axios.put(`/api/admin/users/${formData.value.id}`, data)
        ElMessage.success('用户更新成功')
      }
      dialogVisible.value = false
      fetchUsers()
    } catch (error) {
      console.error('Failed to save user:', error)
    }
  })
}

const deleteUser = async (userId) => {
  try {
    await axios.delete(`/api/admin/users/${userId}`)
    ElMessage.success('用户删除成功')
    fetchUsers()
  } catch (error) {
    console.error('Failed to delete user:', error)
  }
}

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.users-management {
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
