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
            <div class="detail-item">
              <span class="label">用户名:</span>
              <span class="value">{{ account.username }}</span>
            </div>
            <div v-if="account.email_address" class="detail-item">
              <span class="label">邮箱:</span>
              <span class="value">{{ account.email_address }}</span>
            </div>
            <div v-if="account.country" class="detail-item">
              <span class="label">地区:</span>
              <span class="value">{{ [account.country, account.province, account.city].filter(Boolean).join(' ') }}</span>
            </div>
            <div v-if="account.color_type" class="detail-item">
              <span class="label">卡片样式:</span>
              <span class="value">{{ account.color_type === 'solid' ? '单色' : '渐变' }}</span>
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
      :title="editingAccount ? '编辑账户' : '添加账户'"
      width="600px"
    >
      <el-form v-if="editingAccount" label-width="120px">
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
import { ref, onMounted } from 'vue'
import axios from '@/utils/axios'
import { countries } from '@/utils/countries'

const allAccounts = ref([])
const loading = ref(true)
const error = ref(null)
const dialogVisible = ref(false)
const editingAccount = ref(null)
const saving = ref(false)

const showCreateDialog = () => {
  editingAccount.value = {
    account_name: '',
    username: '',
    password: '',
    country: '',
    province: '',
    city: '',
    is_active: 1
  }
  dialogVisible.value = true
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
    dialogVisible.value = false
    await fetchAllAccounts()
  } catch (err) {
    console.error('保存失败:', err)
    error.value = '保存失败: ' + (err.message || '未知错误')
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
  } catch (err) {
    console.error('获取失败:', err)
    error.value = err.message || '未知错误'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchAllAccounts()
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
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.detail-item:last-child {
  border-bottom: none;
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
