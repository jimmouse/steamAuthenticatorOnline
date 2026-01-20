<template>
  <div class="accounts-preview">
    <div class="toolbar">
      <h3>账户预览</h3>
      <el-select
        v-model="selectedAccountId"
        placeholder="选择要预览的账户"
        style="width: 300px"
        filterable
        clearable
        @change="handleAccountChange"
      >
        <el-option
          v-for="account in allAccounts"
          :key="account.id"
          :label="account.account_name"
          :value="account.id"
        />
      </el-select>
    </div>

    <div v-if="!selectedAccountId" class="empty-state">
      <el-empty description="请选择一个账户进行预览" />
    </div>

    <div v-else-if="loading" class="loading-container">
      <el-icon class="is-loading" :size="40"><Loading /></el-icon>
    </div>

    <div v-else-if="selectedAccount" class="preview-container">
      <el-card class="account-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <el-icon><Avatar /></el-icon>
            <span class="account-name">{{ selectedAccount.accountName }}</span>
          </div>
        </template>
        
        <div class="account-info">
          <div class="info-item">
            <label>用户名：</label>
            <div class="value-with-copy">
              <span>{{ selectedAccount.username }}</span>
              <el-button
                size="small"
                :icon="DocumentCopy"
                @click="copyToClipboard(selectedAccount.username, '用户名')"
              />
            </div>
          </div>
          
          <div class="info-item">
            <label>密码：</label>
            <div class="value-with-copy">
              <span>{{ showPassword ? selectedAccount.password : '••••••••' }}</span>
              <el-button
                size="small"
                :icon="showPassword ? Hide : View"
                @click="togglePassword"
              />
              <el-button
                size="small"
                :icon="DocumentCopy"
                @click="copyToClipboard(selectedAccount.password, '密码')"
              />
            </div>
          </div>
          
          <div class="info-item auth-code">
            <label>验证码：</label>
            <div class="code-container">
              <div class="code-display">
                <span class="code">{{ selectedAccount.authCode || '加载中...' }}</span>
                <el-progress
                  :percentage="(selectedAccount.timeRemaining / 30) * 100"
                  :show-text="false"
                  :stroke-width="4"
                  :color="getProgressColor(selectedAccount.timeRemaining)"
                />
                <span class="time-remaining">{{ selectedAccount.timeRemaining }}s</span>
              </div>
              <el-button
                type="primary"
                size="small"
                :icon="DocumentCopy"
                @click="copyToClipboard(selectedAccount.authCode, '验证码')"
              />
            </div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Avatar, DocumentCopy, View, Hide, Loading } from '@element-plus/icons-vue'
import axios from '@/utils/axios'

const allAccounts = ref([])
const selectedAccountId = ref(null)
const selectedAccount = ref(null)
const loading = ref(false)
const showPassword = ref(false)
let refreshInterval = null

const fetchAllAccounts = async () => {
  try {
    const response = await axios.get('/api/admin/steam-accounts')
    allAccounts.value = response.data.accounts
  } catch (error) {
    console.error('Failed to fetch accounts:', error)
  }
}

const fetchAccountDetails = async (accountId) => {
  loading.value = true
  try {
    const response = await axios.get(`/api/admin/steam-accounts/${accountId}/preview`)
    selectedAccount.value = response.data
  } catch (error) {
    console.error('Failed to fetch account details:', error)
    ElMessage.error('获取账户详情失败')
  } finally {
    loading.value = false
  }
}

const refreshAuthCode = async () => {
  if (!selectedAccountId.value) return
  
  try {
    const response = await axios.get(`/api/admin/steam-accounts/${selectedAccountId.value}/code`)
    if (selectedAccount.value) {
      selectedAccount.value.authCode = response.data.authCode
      selectedAccount.value.timeRemaining = response.data.timeRemaining
    }
  } catch (error) {
    console.error('Failed to refresh code:', error)
  }
}

const updateTimeRemaining = () => {
  if (selectedAccount.value && selectedAccount.value.timeRemaining > 0) {
    selectedAccount.value.timeRemaining--
    if (selectedAccount.value.timeRemaining === 0) {
      refreshAuthCode()
    }
  }
}

const handleAccountChange = (accountId) => {
  showPassword.value = false
  if (accountId) {
    fetchAccountDetails(accountId)
  } else {
    selectedAccount.value = null
  }
}

const togglePassword = () => {
  showPassword.value = !showPassword.value
}

const copyToClipboard = async (text, label) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(`${label}已复制到剪贴板`)
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

const getProgressColor = (timeRemaining) => {
  if (timeRemaining > 20) return '#67c23a'
  if (timeRemaining > 10) return '#e6a23c'
  return '#f56c6c'
}

onMounted(() => {
  fetchAllAccounts()
  refreshInterval = setInterval(updateTimeRemaining, 1000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.accounts-preview {
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

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.preview-container {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.account-card {
  width: 100%;
  max-width: 600px;
  transition: transform 0.2s;
}

.account-card:hover {
  transform: translateY(-4px);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: bold;
}

.account-name {
  color: #409eff;
}

.account-info {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item label {
  font-weight: 500;
  color: #606266;
  font-size: 14px;
}

.value-with-copy {
  display: flex;
  align-items: center;
  gap: 8px;
}

.value-with-copy span {
  flex: 1;
  padding: 8px 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
  font-family: monospace;
}

.auth-code {
  margin-top: 10px;
  padding-top: 15px;
  border-top: 1px solid #ebeef5;
}

.code-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.code-display {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.code {
  font-size: 24px;
  font-weight: bold;
  font-family: monospace;
  color: #409eff;
  letter-spacing: 4px;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
  text-align: center;
}

.time-remaining {
  text-align: center;
  font-size: 12px;
  color: #909399;
}
</style>
