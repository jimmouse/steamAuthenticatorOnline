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
          <div 
            class="card-banner" 
            :style="getCardBannerStyle(selectedAccount)"
          >
            <div class="banner-content">
              <el-icon><Avatar /></el-icon>
              <span class="account-name">{{ selectedAccount.accountName }}</span>
            </div>
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
          
          <div v-if="selectedAccount.notes" class="info-item notes-item">
            <div class="notes-header" @click="toggleNotesPreview">
              <label>📝 备注</label>
              <el-icon class="expand-icon" :class="{ expanded: notesExpanded }">
                <ArrowDown />
              </el-icon>
            </div>
            <div v-show="notesExpanded" class="notes-content" v-html="selectedAccount.notes"></div>
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
import { Avatar, DocumentCopy, View, Hide, Loading, ArrowDown } from '@element-plus/icons-vue'
import axios from '@/utils/axios'

const allAccounts = ref([])
const selectedAccountId = ref(null)
const selectedAccount = ref(null)
const loading = ref(false)
const showPassword = ref(false)
const notesExpanded = ref(false)
let refreshInterval = null

const fetchAllAccounts = async () => {
  try {
    const response = await axios.get('/api/admin/steam-accounts')
    allAccounts.value = response.data.accounts || []
  } catch (error) {
    console.error('Failed to fetch accounts:', error)
    ElMessage.error('获取账户列表失败')
  }
}

const fetchAccountDetails = async (accountId) => {
  loading.value = true
  try {
    const response = await axios.get(`/api/admin/steam-accounts/${accountId}/preview`)
    const account = response.data
    
    // 从 allAccounts 中获取颜色信息
    const accountInfo = allAccounts.value.find(a => a.id === accountId)
    if (accountInfo) {
      account.colorType = accountInfo.color_type
      account.colorValue = accountInfo.color_value
      account.colorGradient = accountInfo.color_gradient
    }
    
    selectedAccount.value = account
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
  notesExpanded.value = false
  if (accountId) {
    fetchAccountDetails(accountId)
  } else {
    selectedAccount.value = null
  }
}

const togglePassword = () => {
  showPassword.value = !showPassword.value
}

const toggleNotesPreview = () => {
  notesExpanded.value = !notesExpanded.value
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

const getCardBannerStyle = (account) => {
  if (account.colorType === 'gradient' && account.colorGradient) {
    const colors = account.colorGradient.split(',')
    return {
      background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`
    }
  } else {
    return {
      background: account.colorValue || '#409eff'
    }
  }
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

.account-card :deep(.el-card__header) {
  padding: 0;
  border-bottom: none;
}

.card-banner {
  padding: 20px;
  color: white;
  border-radius: 4px 4px 0 0;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: bold;
}

.account-name {
  color: white;
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

.notes-item {
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px dashed #ebeef5;
}

.notes-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  cursor: pointer;
  user-select: none;
  padding: 5px 0;
}

.notes-header:hover {
  color: #409eff;
}

.expand-icon {
  transition: transform 0.3s;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.notes-content {
  width: 100%;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
  font-family: 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  color: #606266;
  line-height: 1.6;
}

.notes-content :deep(p) {
  margin: 0.5em 0;
}

.notes-content :deep(ul), 
.notes-content :deep(ol) {
  padding-left: 20px;
}

.notes-content :deep(code) {
  background-color: #e7e7e7;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: Consolas, monospace;
}

.notes-content :deep(pre) {
  background-color: #2d2d2d;
  color: #f8f8f2;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
}

.notes-content :deep(blockquote) {
  border-left: 4px solid #409eff;
  padding-left: 12px;
  margin: 10px 0;
  color: #666;
}
</style>
