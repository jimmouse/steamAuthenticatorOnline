<template>
  <div class="user-dashboard">
    <div v-if="loading" class="loading-container">
      <el-icon class="is-loading" :size="40"><Loading /></el-icon>
    </div>
    
    <div v-else-if="accounts.length === 0" class="empty-state">
      <el-empty description="暂无可用的 Steam 账户" />
      <div class="logout-container">
        <el-button type="danger" @click="handleLogout">
          退出登录
        </el-button>
      </div>
    </div>
    
    <div v-else class="accounts-container">
      <div class="accounts-grid">
        <el-card
          v-for="account in accounts"
          :key="account.id"
          class="account-card"
          shadow="hover"
        >
          <template #header>
            <div 
              class="card-banner" 
              :style="getCardBannerStyle(account)"
            >
              <div class="banner-content">
                <el-icon><Avatar /></el-icon>
                <span class="account-name">{{ account.accountName }}</span>
              </div>
            </div>
          </template>
          
          <div class="account-info">
            <div class="info-item">
              <label>👤 用户名：</label>
              <div class="value-with-copy">
                <span>{{ account.username }}</span>
                <el-button
                  size="small"
                  :icon="DocumentCopy"
                  @click="copyToClipboard(account.username, '用户名')"
                />
              </div>
            </div>
            
            <div class="info-item">
              <label>🔑 密码：</label>
              <div class="value-with-copy">
                <span>{{ showPassword[account.id] ? account.password : '••••••••' }}</span>
                <el-button
                  size="small"
                  :icon="showPassword[account.id] ? Hide : View"
                  @click="togglePassword(account.id)"
                />
                <el-button
                  size="small"
                  :icon="DocumentCopy"
                  @click="copyToClipboard(account.password, '密码')"
                />
              </div>
            </div>
            
            <div v-if="account.notes" class="info-item notes-item">
              <div class="notes-header" @click="toggleNotes(account.id)">
                <label>📝 备注</label>
                <el-icon class="expand-icon" :class="{ expanded: expandedNotes[account.id] }">
                  <ArrowDown />
                </el-icon>
              </div>
              <div v-show="expandedNotes[account.id]" class="notes-content" v-html="account.notes"></div>
            </div>
            
            <div class="info-item auth-code">
              <label>🔐 验证码：</label>
              <div class="code-container">
                <div class="code-display">
                  <span class="code">{{ account.authCode || '加载中...' }}</span>
                  <el-progress
                    :percentage="(account.timeRemaining / 30) * 100"
                    :show-text="false"
                    :stroke-width="4"
                    :color="getProgressColor(account.timeRemaining)"
                  />
                  <span class="time-remaining">{{ account.timeRemaining }}s</span>
                </div>
                <el-button
                  type="primary"
                  size="small"
                  :icon="DocumentCopy"
                  @click="copyToClipboard(account.authCode, '验证码')"
                />
              </div>
            </div>
          </div>
        </el-card>
      </div>
      
      <div class="logout-container">
        <el-button type="danger" @click="handleLogout">
          退出登录
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Avatar, DocumentCopy, View, Hide, Loading, ArrowDown } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import axios from '@/utils/axios'

const router = useRouter()
const authStore = useAuthStore()

const accounts = ref([])
const loading = ref(true)
const showPassword = reactive({})
const expandedNotes = reactive({})
let refreshInterval = null

const fetchAccounts = async () => {
  try {
    const response = await axios.get('/api/user/accounts')
    accounts.value = response.data.accounts
  } catch (error) {
    console.error('Failed to fetch accounts:', error)
  } finally {
    loading.value = false
  }
}

const refreshAuthCodes = async () => {
  for (const account of accounts.value) {
    try {
      const response = await axios.get(`/api/user/accounts/${account.id}/code`)
      account.authCode = response.data.authCode
      account.timeRemaining = response.data.timeRemaining
    } catch (error) {
      console.error(`Failed to refresh code for account ${account.id}:`, error)
    }
  }
}

const updateTimeRemaining = () => {
  accounts.value.forEach(account => {
    if (account.timeRemaining > 0) {
      account.timeRemaining--
    }
    if (account.timeRemaining === 0) {
      refreshAuthCodes()
    }
  })
}

const togglePassword = (accountId) => {
  showPassword[accountId] = !showPassword[accountId]
}

const toggleNotes = (accountId) => {
  expandedNotes[accountId] = !expandedNotes[accountId]
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

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}

onMounted(() => {
  fetchAccounts()
  refreshInterval = setInterval(updateTimeRemaining, 1000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.user-dashboard {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.accounts-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.accounts-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 24px;
  width: 100%;
  max-width: 1600px;
  margin-bottom: 40px;
}

.account-card {
  min-width: 500px;
  max-width: 600px;
  flex: 1 1 auto;
}

.account-card {
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

.logout-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 40px;
  padding-top: 40px;
}
</style>
