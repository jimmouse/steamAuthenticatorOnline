<template>
  <div class="accounts-management">
    <div class="toolbar">
      <h3>Steam 账户管理</h3>
      <el-button type="primary" @click="showCreateDialog">添加账户</el-button>
    </div>
    <div v-if="error" style="color: red; padding: 20px;">
      错误：{{ error }}
    </div>
    <div v-else-if="loading" style="padding: 20px;">
      加载中...
    </div>
    <div v-else>
      <div class="accounts-grid">
        <el-card
          v-for="account in allAccounts"
          :key="account.id"
          class="account-card"
          shadow="hover"
        >
          <template #header>
            <div 
              class="card-header"
              :style="getCardHeaderStyle(account)"
            >
              <h3>{{ account.account_name }}</h3>
              <el-tag :type="account.is_active ? 'success' : 'info'" size="small">
                {{ account.is_active ? '启用' : '禁用' }}
              </el-tag>
            </div>
          </template>
          
          <div class="account-details">
            <div class="detail-item">
              <span class="label">ID:</span>
              <span class="value">{{ account.id }}</span>
            </div>
            <div class="detail-item with-copy">
              <div class="label-value">
                <span class="label">用户名:</span>
                <span class="value">{{ account.username }}</span>
              </div>
              <el-button 
                size="small" 
                :icon="DocumentCopy" 
                @click="copyToClipboard(account.username, '用户名')"
              />
            </div>
            <div class="detail-item with-copy">
              <div class="label-value">
                <span class="label">密码:</span>
                <span class="value">{{ account.password ? '••••••••' : '未设置' }}</span>
              </div>
              <el-button 
                v-if="account.password"
                size="small" 
                :icon="DocumentCopy" 
                @click="copyToClipboard(account.password, '密码')"
              />
            </div>
            <div class="detail-item with-copy">
              <div class="label-value">
                <span class="label">令牌码:</span>
                <span class="value">{{ account.currentCode || '加载中...' }}</span>
              </div>
              <el-button 
                v-if="account.currentCode"
                size="small" 
                :icon="DocumentCopy" 
                @click="copyToClipboard(account.currentCode, '令牌码')"
              />
            </div>
            <div v-if="account.email_address" class="detail-item">
              <span class="label">邮箱:</span>
              <span class="value">{{ account.email_address }}</span>
            </div>
            <div v-if="account.country" class="detail-item">
              <span class="label">地区:</span>
              <span class="value">{{ [account.country, account.province, account.city].filter(Boolean).join(' ') }}</span>
            </div>
            <div class="detail-item">
              <span class="label">创建时间:</span>
              <span class="value">{{ new Date(account.created_at).toLocaleString('zh-CN') }}</span>
            </div>
          </div>
          
          <template #footer>
            <div class="card-actions">
              <el-button size="small" @click="viewAccount(account.id)">查看</el-button>
              <el-button size="small" type="primary" @click="editAccount(account)">编辑</el-button>
              <el-popconfirm title="确定删除此账户吗?" @confirm="deleteAccount(account.id)">
                <template #reference>
                  <el-button size="small" type="danger">删除</el-button>
                </template>
              </el-popconfirm>
            </div>
          </template>
        </el-card>
      </div>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="isEditMode ? '编辑账户' : '添加账户'"
      width="600px"
    >
      <el-form v-if="editingAccount" label-width="120px">
        <el-form-item v-if="!isEditMode" label="SDA 文件">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :limit="1"
            accept=".mafile"
            :on-change="handleFileChange"
            :file-list="fileList"
          >
            <el-button type="primary">选择 .mafile 文件</el-button>
            <template #tip>
              <div class="el-upload__tip">
                只支持 .mafile 格式的 SDA 文件
              </div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item label="账户名称">
          <el-input v-model="editingAccount.account_name" />
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model="editingAccount.username" disabled />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="editingAccount.password" type="password" placeholder="留空则不修改" />
        </el-form-item>
        <el-form-item label="邮箱地址">
          <el-input v-model="editingAccount.email_address" placeholder="Steam账户绑定的邮箱" />
        </el-form-item>
        <el-form-item label="邮箱登录地址">
          <el-input v-model="editingAccount.email_login_url" placeholder="邮箱登录网址" />
        </el-form-item>
        <el-form-item label="邮箱密码">
          <el-input v-model="editingAccount.email_password" type="password" placeholder="留空则不修改" />
        </el-form-item>
        <el-form-item label="国家">
          <el-select v-model="editingAccount.country" placeholder="请选择国家" filterable>
            <el-option v-for="country in countries" :key="country" :label="country" :value="country" />
          </el-select>
        </el-form-item>
        <el-form-item label="省份">
          <el-input v-model="editingAccount.province" />
        </el-form-item>
        <el-form-item label="城市">
          <el-input v-model="editingAccount.city" />
        </el-form-item>
        <el-form-item label="卡片样式">
          <el-radio-group v-model="editingAccount.color_type">
            <el-radio value="solid">单色</el-radio>
            <el-radio value="gradient">渐变</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="editingAccount.color_type === 'solid'" label="卡片颜色">
          <el-color-picker v-model="editingAccount.color_value" />
        </el-form-item>
        <el-form-item v-if="editingAccount.color_type === 'gradient'" label="渐变色">
          <div style="display: flex; gap: 10px; align-items: center;">
            <el-color-picker v-model="editingAccount.gradient_start" />
            <span>到</span>
            <el-color-picker v-model="editingAccount.gradient_end" />
          </div>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="editingAccount.is_active" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveAccount" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import axios from '@/utils/axios'
import { countries } from '@/utils/countries'
import { DocumentCopy } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const allAccounts = ref([])
const loading = ref(true)
const error = ref(null)
const dialogVisible = ref(false)
const editingAccount = ref(null)
const saving = ref(false)
const isEditMode = ref(false)
const uploadRef = ref(null)
const fileList = ref([])
const uploadedFile = ref(null)
let codeRefreshInterval = null

const showCreateDialog = () => {
  isEditMode.value = false
  fileList.value = []
  uploadedFile.value = null
  editingAccount.value = {
    account_name: '',
    username: '',
    password: '',
    email_address: '',
    email_login_url: '',
    email_password: '',
    country: '',
    province: '',
    city: '',
    color_type: 'gradient',
    color_value: '#667eea',
    gradient_start: '#667eea',
    gradient_end: '#764ba2',
    is_active: 1
  }
  dialogVisible.value = true
}

const handleFileChange = (file) => {
  uploadedFile.value = file.raw
  fileList.value = [file]
}

const getCardHeaderStyle = (account) => {
  if (!account.color_type) {
    return {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '15px',
      borderRadius: '4px 4px 0 0'
    }
  }
  
  if (account.color_type === 'solid') {
    return {
      background: account.color_value || '#667eea',
      color: 'white',
      padding: '15px',
      borderRadius: '4px 4px 0 0'
    }
  }
  
  if (account.color_type === 'gradient' && account.color_gradient) {
    const colors = account.color_gradient.split(',')
    return {
      background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
      color: 'white',
      padding: '15px',
      borderRadius: '4px 4px 0 0'
    }
  }
  
  return {}
}

const viewAccount = (id) => {
  window.open(`#/admin/accounts/${id}`, '_blank')
}

const editAccount = (account) => {
  isEditMode.value = true
  fileList.value = []
  uploadedFile.value = null
  const gradientColors = account.color_gradient ? account.color_gradient.split(',') : ['#667eea', '#764ba2']
  editingAccount.value = {
    ...account,
    gradient_start: gradientColors[0],
    gradient_end: gradientColors[1]
  }
  dialogVisible.value = true
}

const saveAccount = async () => {
  if (!editingAccount.value) return
  
  saving.value = true
  try {
    if (isEditMode.value) {
      const data = {
        account_name: editingAccount.value.account_name,
        email_address: editingAccount.value.email_address,
        email_login_url: editingAccount.value.email_login_url,
        country: editingAccount.value.country,
        province: editingAccount.value.province,
        city: editingAccount.value.city,
        color_type: editingAccount.value.color_type,
        color_value: editingAccount.value.color_value,
        color_gradient: editingAccount.value.color_type === 'gradient' 
          ? `${editingAccount.value.gradient_start},${editingAccount.value.gradient_end}`
          : null,
        is_active: editingAccount.value.is_active
      }
      
      if (editingAccount.value.password) {
        data.password = editingAccount.value.password
      }
      
      if (editingAccount.value.email_password) {
        data.email_password = editingAccount.value.email_password
      }
      
      await axios.put(`/api/admin/steam-accounts/${editingAccount.value.id}`, data)
    } else {
      if (!uploadedFile.value) {
        error.value = '请选择 .mafile 文件'
        saving.value = false
        return
      }
      
      const formData = new FormData()
      formData.append('sdaFile', uploadedFile.value)
      formData.append('description', editingAccount.value.account_name)
      formData.append('password', editingAccount.value.password)
      formData.append('email_address', editingAccount.value.email_address)
      formData.append('email_login_url', editingAccount.value.email_login_url)
      formData.append('email_password', editingAccount.value.email_password)
      formData.append('country', editingAccount.value.country)
      formData.append('province', editingAccount.value.province)
      formData.append('city', editingAccount.value.city)
      formData.append('colorType', editingAccount.value.color_type)
      formData.append('colorValue', editingAccount.value.color_value)
      if (editingAccount.value.color_type === 'gradient') {
        formData.append('colorGradient', `${editingAccount.value.gradient_start},${editingAccount.value.gradient_end}`)
      }
      
      await axios.post('/api/admin/steam-accounts', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
    }
    
    dialogVisible.value = false
    await fetchAllAccounts()
  } catch (err) {
    console.error('保存失败:', err)
    error.value = '保存失败: ' + (err.response?.data?.error || err.message || '未知错误')
  } finally {
    saving.value = false
  }
}

const deleteAccount = async (id) => {
  try {
    await axios.delete(`/api/admin/steam-accounts/${id}`)
    await fetchAllAccounts()
  } catch (err) {
    console.error('删除失败:', err)
  }
}

const fetchAllAccounts = async () => {
  try {
    console.log('开始获取账户列表...')
    const response = await axios.get('/api/admin/steam-accounts')
    console.log('API响应:', response)
    allAccounts.value = response.data.accounts || []
    console.log('账户列表:', allAccounts.value)
    
    // 为每个账户获取令牌码
    refreshAllCodes()
  } catch (err) {
    console.error('获取失败:', err)
    error.value = err.message || '未知错误'
  } finally {
    loading.value = false
  }
}

const refreshAllCodes = async () => {
  for (const account of allAccounts.value) {
    try {
      const response = await axios.get(`/api/admin/steam-accounts/${account.id}/code`)
      account.currentCode = response.data.authCode
    } catch (err) {
      console.error(`获取账户 ${account.id} 令牌码失败:`, err)
      account.currentCode = null
    }
  }
}

const copyToClipboard = async (text, label) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(`${label}已复制到剪贴板`)
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

onMounted(() => {
  fetchAllAccounts()
  // 每30秒刷新一次令牌码
  codeRefreshInterval = setInterval(refreshAllCodes, 30000)
})

onUnmounted(() => {
  if (codeRefreshInterval) {
    clearInterval(codeRefreshInterval)
  }
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
  font-size: 20px;
  font-weight: 500;
}

.accounts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.account-card {
  transition: transform 0.2s;
}

.account-card:hover {
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-radius: 4px 4px 0 0;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: white;
}

.account-details {
  padding: 10px 0;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-item.with-copy {
  gap: 8px;
}

.detail-item .label-value {
  display: flex;
  justify-content: space-between;
  flex: 1;
}

.detail-item .label {
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.detail-item .value {
  color: var(--el-text-color-primary);
  font-size: 14px;
  font-weight: 500;
}

.card-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
</style>
