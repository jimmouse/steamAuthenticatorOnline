<template>
  <div class="user-dashboard" :style="userBgStyle">
    <div class="user-header">
      <div class="user-info">
        <el-icon><Avatar /></el-icon>
        <span class="username">{{ displayUsername }}</span>
      </div>
      <el-button type="danger" size="small" @click="handleLogout">
        退出登录
      </el-button>
    </div>

    <div v-if="loading" class="loading-container">
      <el-icon class="is-loading" :size="40"><Loading /></el-icon>
    </div>
    
    <div v-else-if="accounts.length === 0" class="empty-state">
      <el-empty description="暂无可用的 Steam 账户" />
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

            <div v-if="account.emailAddress" class="info-item">
              <label>📧 邮箱：</label>
              <div class="value-with-copy">
                <span>{{ account.emailAddress }}</span>
                <el-button
                  size="small"
                  :icon="DocumentCopy"
                  @click="copyToClipboard(account.emailAddress, '邮箱')"
                />
                <el-button
                  v-if="account.emailLoginUrl"
                  size="small"
                  type="primary"
                  @click="openEmailLogin(account.emailLoginUrl)"
                >
                  登录邮箱
                </el-button>
              </div>
            </div>

            <div v-if="account.emailPassword" class="info-item">
              <label>🔐 邮箱密码：</label>
              <div class="value-with-copy">
                <span>{{ showPassword[account.id + '_email'] ? account.emailPassword : '••••••••' }}</span>
                <el-button
                  size="small"
                  :icon="showPassword[account.id + '_email'] ? Hide : View"
                  @click="togglePassword(account.id + '_email')"
                />
                <el-button
                  size="small"
                  :icon="DocumentCopy"
                  @click="copyToClipboard(account.emailPassword, '邮箱密码')"
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

            <div class="info-item" style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #ebeef5;">
              <el-button
                type="success"
                style="width: 100%;"
                @click="showConfirmations(account)"
              >
                🔑 登录/交易确认
              </el-button>
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

    <el-dialog
      v-model="confirmationDialogVisible"
      title="Steam 登录/交易确认"
      width="700px"
    >
      <div v-if="loadingConfirmations" style="text-align: center; padding: 20px;">
        <el-icon class="is-loading" :size="40"><Loading /></el-icon>
        <p>正在获取待确认项...</p>
      </div>

      <div v-else-if="confirmations.length === 0" style="text-align: center; padding: 20px;">
        <el-empty description="暂无待确认项" />
      </div>

      <div v-else>
        <el-alert
          title="提示"
          type="info"
          :closable="false"
          style="margin-bottom: 15px;"
        >
          找到 {{ confirmations.length }} 个待确认项
        </el-alert>

        <el-table
          :data="confirmations"
          @selection-change="handleSelectionChange"
          style="width: 100%"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column prop="typeDescription" label="类型" width="120" />
          <el-table-column prop="description" label="描述" />
          <el-table-column label="操作" width="180">
            <template #default="{ row }">
              <el-button
                size="small"
                type="success"
                @click="acceptSingleConfirmation(row)"
                :loading="row.processing"
              >
                接受
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="denySingleConfirmation(row)"
                :loading="row.processing"
              >
                拒绝
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div style="margin-top: 15px; display: flex; gap: 10px;">
          <el-button
            type="success"
            @click="acceptSelectedConfirmations"
            :disabled="selectedConfirmations.length === 0"
            :loading="batchProcessing"
          >
            批量接受 ({{ selectedConfirmations.length }})
          </el-button>
          <el-button @click="refreshConfirmations" :loading="loadingConfirmations">
            刷新列表
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
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

const systemSettings = ref({
  user_bg_type: 'solid',
  user_bg_color: '#f5f7fa',
  user_bg_gradient: null
})

const confirmationDialogVisible = ref(false)
const loadingConfirmations = ref(false)
const confirmations = ref([])
const selectedConfirmations = ref([])
const currentAccount = ref(null)
const batchProcessing = ref(false)

const displayUsername = computed(() => {
  const user = authStore.user
  if (!user) return '未知用户'
  
  // 临时用户显示授权码前6位
  if (user.role === 'temp_user' && user.username) {
    const match = user.username.match(/临时用户_([a-f0-9]+)/)
    if (match && match[1]) {
      return `授权码: ${match[1].substring(0, 6)}...`
    }
    return user.username
  }
  
  // 普通用户显示用户名
  return user.username
})

const userBgStyle = computed(() => {
  if (systemSettings.value.user_bg_type === 'gradient' && systemSettings.value.user_bg_gradient) {
    const colors = systemSettings.value.user_bg_gradient.split(',')
    return {
      background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`
    }
  } else {
    return {
      background: systemSettings.value.user_bg_color || '#f5f7fa'
    }
  }
})

const fetchAccounts = async () => {
  try {
    const response = await axios.get('/api/user/accounts')
    console.log('[FETCH_ACCOUNTS] Response:', response.data)
    console.log('[FETCH_ACCOUNTS] User:', authStore.user)
    accounts.value = response.data.accounts
    if (accounts.value.length === 0) {
      console.warn('[FETCH_ACCOUNTS] No accounts returned from API')
    }
  } catch (error) {
    console.error('Failed to fetch accounts:', error)
    ElMessage.error('获取账户列表失败：' + (error.response?.data?.error || error.message))
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

const openEmailLogin = (url) => {
  window.open(url, '_blank')
}

const fetchSettings = async () => {
  try {
    const response = await axios.get('/api/auth/settings')
    Object.assign(systemSettings.value, response.data.settings)
  } catch (error) {
    console.error('Failed to fetch settings:', error)
  }
}

const showConfirmations = async (account) => {
  currentAccount.value = account
  confirmationDialogVisible.value = true
  await refreshConfirmations()
}

const refreshConfirmations = async () => {
  if (!currentAccount.value) return
  
  loadingConfirmations.value = true
  try {
    const response = await axios.get(`/api/user/accounts/${currentAccount.value.id}/confirmations`)
    confirmations.value = response.data.confirmations.map(c => ({ ...c, processing: false }))
    
    if (confirmations.value.length === 0) {
      ElMessage.info('当前没有待确认的交易')
    }
  } catch (error) {
    console.error('Failed to fetch confirmations:', error)
    const errorMsg = error.response?.data?.message || '获取确认列表失败'
    const hint = error.response?.data?.hint
    
    // 如果是400错误且包含session相关信息，显示更友好的提示
    if (error.response?.status === 400 && errorMsg.includes('会话')) {
      ElMessage({
        message: '此账户暂不支持在线查看确认。\n\n原因：Steam确认功能需要有效的登录会话。\n建议：请使用Steam官方应用或Steam Desktop Authenticator查看确认。',
        type: 'info',
        duration: 8000,
        showClose: true,
        dangerouslyUseHTMLString: true
      })
    } else {
      ElMessage({
        message: hint ? `${errorMsg}\n\n${hint}` : errorMsg,
        type: 'warning',
        duration: 5000,
        showClose: true
      })
    }
    
    confirmationDialogVisible.value = false
  } finally {
    loadingConfirmations.value = false
  }
}

const handleSelectionChange = (selection) => {
  selectedConfirmations.value = selection
}

const acceptSingleConfirmation = async (confirmation) => {
  confirmation.processing = true
  try {
    await axios.post(
      `/api/user/accounts/${currentAccount.value.id}/confirmations/${confirmation.id}/accept`,
      { confKey: confirmation.key }
    )
    ElMessage.success('确认成功')
    await refreshConfirmations()
  } catch (error) {
    console.error('Failed to accept confirmation:', error)
    ElMessage.error('确认失败')
  } finally {
    confirmation.processing = false
  }
}

const denySingleConfirmation = async (confirmation) => {
  confirmation.processing = true
  try {
    await axios.post(
      `/api/user/accounts/${currentAccount.value.id}/confirmations/${confirmation.id}/deny`,
      { confKey: confirmation.key }
    )
    ElMessage.success('已拒绝')
    await refreshConfirmations()
  } catch (error) {
    console.error('Failed to deny confirmation:', error)
    ElMessage.error('拒绝失败')
  } finally {
    confirmation.processing = false
  }
}

const acceptSelectedConfirmations = async () => {
  if (selectedConfirmations.value.length === 0) return
  
  batchProcessing.value = true
  try {
    const confs = selectedConfirmations.value.map(c => ({ id: c.id, key: c.key }))
    await axios.post(
      `/api/user/accounts/${currentAccount.value.id}/confirmations/accept`,
      { confirmations: confs }
    )
    ElMessage.success(`已确认 ${selectedConfirmations.value.length} 个项目`)
    await refreshConfirmations()
  } catch (error) {
    console.error('Failed to accept confirmations:', error)
    ElMessage.error('批量确认失败')
  } finally {
    batchProcessing.value = false
  }
}

onMounted(() => {
  fetchSettings()
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
  padding: 20px;
  transition: background 0.3s ease;
}

.user-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.user-info .el-icon {
  font-size: 24px;
  color: #409eff;
}

.username {
  font-weight: 600;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
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
  border-radius: 12px;
  overflow: hidden;
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
