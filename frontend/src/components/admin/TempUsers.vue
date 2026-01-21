<template>
  <div class="temp-users">
    <div class="toolbar">
      <h3>临时授权码管理</h3>
      <el-button type="primary" @click="showCreateDialog">
        创建授权码
      </el-button>
    </div>

    <el-table :data="tempUsers" stripe style="width: 100%">
      <el-table-column prop="access_code" label="授权码" width="300">
        <template #default="{ row }">
          <div class="code-cell">
            <code>{{ row.access_code }}</code>
            <el-button size="small" :icon="DocumentCopy" @click="copyCode(row.access_code)" />
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="account_name" label="关联账户" width="150" />
      <el-table-column label="使用情况" width="120">
        <template #default="{ row }">
          {{ row.current_uses }}{{ row.max_uses ? `/${row.max_uses}` : '/无限' }}
        </template>
      </el-table-column>
      <el-table-column prop="expires_at" label="过期时间" width="180">
        <template #default="{ row }">
          {{ row.expires_at ? new Date(row.expires_at).toLocaleString('zh-CN') : '永不过期' }}
        </template>
      </el-table-column>
      <el-table-column prop="is_active" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.is_active ? 'success' : 'danger'">
            {{ row.is_active ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_by_username" label="创建者" width="120" />
      <el-table-column label="操作" width="250" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="showEditDialog(row)">编辑</el-button>
          <el-button size="small" type="warning" @click="resetUses(row.id)">重置次数</el-button>
          <el-button size="small" type="danger" @click="deleteUser(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="dialogMode === 'create' ? '创建授权码' : '编辑授权码'" width="500px">
      <el-form :model="formData" label-width="100px">
        <el-form-item v-if="dialogMode === 'create'" label="关联账户">
          <el-select v-model="formData.steamAccountId" placeholder="选择Steam账户" style="width: 100%">
            <el-option v-for="account in steamAccounts" :key="account.id" :label="account.account_name" :value="account.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="过期时间">
          <el-date-picker v-model="formData.expiresAt" type="datetime" placeholder="选择过期时间" style="width: 100%" />
        </el-form-item>
        <el-form-item label="最大使用次数">
          <el-input-number v-model="formData.maxUses" :min="0" placeholder="0表示无限制" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="formData.isActive" active-text="启用" inactive-text="禁用" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="formData.notes" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DocumentCopy } from '@element-plus/icons-vue'
import axios from '@/utils/axios'

const tempUsers = ref([])
const steamAccounts = ref([])
const dialogVisible = ref(false)
const dialogMode = ref('create')
const submitting = ref(false)
const formData = ref({
  steamAccountId: null,
  expiresAt: null,
  maxUses: 0,
  isActive: true,
  notes: ''
})
const editingId = ref(null)

const fetchTempUsers = async () => {
  try {
    const response = await axios.get('/api/admin/temp-users')
    tempUsers.value = response.data.tempUsers
  } catch (error) {
    console.error('Failed to fetch temp users:', error)
    ElMessage.error('获取授权码列表失败')
  }
}

const fetchSteamAccounts = async () => {
  try {
    const response = await axios.get('/api/admin/steam-accounts')
    steamAccounts.value = response.data.accounts
  } catch (error) {
    console.error('Failed to fetch steam accounts:', error)
  }
}

const showCreateDialog = () => {
  dialogMode.value = 'create'
  formData.value = {
    steamAccountId: null,
    expiresAt: null,
    maxUses: 0,
    isActive: true,
    notes: ''
  }
  dialogVisible.value = true
}

const showEditDialog = (row) => {
  dialogMode.value = 'edit'
  editingId.value = row.id
  formData.value = {
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    maxUses: row.max_uses || 0,
    isActive: row.is_active === 1,
    notes: row.notes || ''
  }
  dialogVisible.value = true
}

const handleSubmit = async () => {
  submitting.value = true
  try {
    const data = {
      ...formData.value,
      expiresAt: formData.value.expiresAt ? formData.value.expiresAt.toISOString() : null,
      maxUses: formData.value.maxUses || null
    }

    if (dialogMode.value === 'create') {
      await axios.post('/api/admin/temp-users', data)
      ElMessage.success('授权码创建成功')
    } else {
      await axios.put(`/api/admin/temp-users/${editingId.value}`, data)
      ElMessage.success('授权码更新成功')
    }

    dialogVisible.value = false
    fetchTempUsers()
  } catch (error) {
    console.error('Failed to save:', error)
    ElMessage.error('保存失败')
  } finally {
    submitting.value = false
  }
}

const copyCode = async (code) => {
  try {
    await navigator.clipboard.writeText(code)
    ElMessage.success('授权码已复制')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

const resetUses = async (id) => {
  try {
    await ElMessageBox.confirm('确定重置使用次数吗？', '确认', { type: 'warning' })
    await axios.post(`/api/admin/temp-users/${id}/reset-uses`)
    ElMessage.success('重置成功')
    fetchTempUsers()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('重置失败')
    }
  }
}

const deleteUser = async (id) => {
  try {
    await ElMessageBox.confirm('确定删除此授权码吗？', '确认删除', { type: 'warning' })
    await axios.delete(`/api/admin/temp-users/${id}`)
    ElMessage.success('删除成功')
    fetchTempUsers()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

onMounted(() => {
  fetchTempUsers()
  fetchSteamAccounts()
})
</script>

<style scoped>
.temp-users {
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

.code-cell {
  display: flex;
  gap: 10px;
  align-items: center;
}

.code-cell code {
  flex: 1;
  background: #f5f7fa;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
}
</style>
