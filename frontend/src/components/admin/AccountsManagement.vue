<template>
  <div class="accounts-management">
    <div class="toolbar">
      <h3>Steam 账户管理</h3>
      <el-button type="primary" :icon="Plus" @click="showCreateDialog">
        添加账户
      </el-button>
    </div>

    <el-table :data="accounts" stripe style="width: 100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="account_name" label="账户名称" />
      <el-table-column prop="username" label="用户名" />
      <el-table-column prop="created_at" label="创建时间" width="180" />
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
            title="确定删除此账户吗？"
            @confirm="deleteAccount(row.id)"
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
      :title="dialogMode === 'create' ? '添加 Steam 账户' : '编辑 Steam 账户'"
      width="600px"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="120px"
      >
        <el-form-item v-if="dialogMode === 'create'" label="SDA 文件" prop="sdaFile">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :limit="1"
            accept=".mafile"
            :on-change="handleFileChange"
          >
            <el-button type="primary">选择 .mafile 文件</el-button>
            <template #tip>
              <div class="el-upload__tip">
                只支持 .mafile 格式的 SDA 文件
              </div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item label="账户名称" prop="accountName">
          <el-input v-model="formData.accountName" placeholder="可选，留空则使用 SDA 文件中的账户名" />
        </el-form-item>
        <el-form-item label="用户名" prop="username">
          <el-input v-model="formData.username" placeholder="Steam 登录用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="formData.password" type="password" placeholder="Steam 登录密码" />
        </el-form-item>
        <el-form-item v-if="dialogMode === 'edit'" label="状态" prop="is_active">
          <el-switch v-model="formData.is_active" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="uploading">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import axios from '@/utils/axios'

const accounts = ref([])
const dialogVisible = ref(false)
const dialogMode = ref('create')
const uploading = ref(false)
const formRef = ref(null)
const uploadRef = ref(null)
const formData = ref({
  id: null,
  accountName: '',
  username: '',
  password: '',
  sdaFile: null,
  is_active: true
})

const rules = {
  sdaFile: [
    { required: true, message: '请选择 SDA 文件', trigger: 'change', validator: (rule, value, callback) => {
      if (dialogMode.value === 'create' && !formData.value.sdaFile) {
        callback(new Error('请选择 SDA 文件'))
      } else {
        callback()
      }
    }}
  ]
}

const fetchAccounts = async () => {
  try {
    const response = await axios.get('/api/admin/steam-accounts')
    accounts.value = response.data.accounts
  } catch (error) {
    console.error('Failed to fetch accounts:', error)
  }
}

const handleFileChange = (file) => {
  formData.value.sdaFile = file.raw
}

const showCreateDialog = () => {
  dialogMode.value = 'create'
  formData.value = {
    id: null,
    accountName: '',
    username: '',
    password: '',
    sdaFile: null,
    is_active: true
  }
  dialogVisible.value = true
}

const showEditDialog = (account) => {
  dialogMode.value = 'edit'
  formData.value = {
    id: account.id,
    accountName: account.account_name,
    username: account.username,
    password: '',
    sdaFile: null,
    is_active: account.is_active === 1
  }
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    
    uploading.value = true
    try {
      if (dialogMode.value === 'create') {
        const formDataToSend = new FormData()
        formDataToSend.append('sdaFile', formData.value.sdaFile)
        if (formData.value.accountName) {
          formDataToSend.append('accountName', formData.value.accountName)
        }
        if (formData.value.username) {
          formDataToSend.append('username', formData.value.username)
        }
        if (formData.value.password) {
          formDataToSend.append('password', formData.value.password)
        }
        
        await axios.post('/api/admin/steam-accounts', formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        ElMessage.success('Steam 账户添加成功')
      } else {
        const data = {
          accountName: formData.value.accountName,
          username: formData.value.username,
          is_active: formData.value.is_active
        }
        if (formData.value.password) {
          data.password = formData.value.password
        }
        await axios.put(`/api/admin/steam-accounts/${formData.value.id}`, data)
        ElMessage.success('Steam 账户更新成功')
      }
      dialogVisible.value = false
      fetchAccounts()
    } catch (error) {
      console.error('Failed to save account:', error)
    } finally {
      uploading.value = false
    }
  })
}

const deleteAccount = async (accountId) => {
  try {
    await axios.delete(`/api/admin/steam-accounts/${accountId}`)
    ElMessage.success('Steam 账户删除成功')
    fetchAccounts()
  } catch (error) {
    console.error('Failed to delete account:', error)
  }
}

onMounted(() => {
  fetchAccounts()
})
</script>

<style scoped>
.accounts-management {
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
