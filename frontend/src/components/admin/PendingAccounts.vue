<template>
  <div class="pending-accounts">
    <div class="toolbar">
      <h3>未激活账户管理</h3>
      <el-button type="primary" @click="showGenerateDialog">
        生成新账户
      </el-button>
    </div>

    <div class="accounts-grid">
      <el-card v-for="account in accounts" :key="account.id" class="account-card">
        <template #header>
          <div class="card-header">
            <span class="username">{{ account.username }}</span>
            <el-tag :type="account.status === 'activated' ? 'success' : 'warning'" size="small">
              {{ account.status === 'activated' ? '已激活' : '待激活' }}
            </el-tag>
          </div>
        </template>
        
        <div class="account-info">
          <div class="info-item">
            <label>🔑 密码：</label>
            <div class="value-with-copy">
              <span>{{ showPasswords[account.id] ? (account.password || '未设置') : '••••••••' }}</span>
              <el-button
                v-if="account.password"
                size="small"
                :icon="showPasswords[account.id] ? Hide : View"
                @click="togglePassword(account.id)"
              />
              <el-button
                v-if="account.password"
                size="small"
                :icon="DocumentCopy"
                @click="copyToClipboard(account.password, '密码')"
              />
            </div>
          </div>
          
          <div v-if="account.email" class="info-item">
            <label>📧 邮箱：</label>
            <div class="value-with-copy">
              <span>{{ account.email }}</span>
              <el-button
                size="small"
                :icon="DocumentCopy"
                @click="copyToClipboard(account.email, '邮箱')"
              />
            </div>
          </div>
          
          <div class="info-item">
            <label>📅 创建时间：</label>
            <span>{{ new Date(account.created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) }}</span>
          </div>
          
          <div v-if="account.notes" class="info-item">
            <label>📝 备注：</label>
            <span>{{ account.notes }}</span>
          </div>
        </div>
        
        <template #footer>
          <div class="card-actions">
            <el-button
              v-if="account.status === 'pending'"
              type="success"
              size="small"
              @click="showActivateDialog(account)"
            >
              激活账户
            </el-button>
            <el-button
              type="danger"
              size="small"
              @click="deleteAccount(account.id)"
            >
              删除
            </el-button>
          </div>
        </template>
      </el-card>
    </div>

    <!-- 生成账户对话框 -->
    <el-dialog
      v-model="generateDialogVisible"
      title="生成Steam账户信息"
      width="700px"
    >
      <el-form label-width="120px">
        <el-form-item label="用户名生成模式">
          <el-radio-group v-model="usernameMode">
            <el-radio value="wordlist">词库组合</el-radio>
            <el-radio value="foreign">外文名</el-radio>
            <el-radio value="random">随机字符</el-radio>
            <el-radio value="mixed">混合模式</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 词库组合模式选项 -->
        <template v-if="usernameMode === 'wordlist'">
          <el-form-item label="词库选择">
            <el-radio-group v-model="useCustomWords">
              <el-radio :value="false">使用默认词库</el-radio>
              <el-radio :value="true">使用自定义词库</el-radio>
            </el-radio-group>
          </el-form-item>
          
          <el-form-item v-if="useCustomWords" label="自定义词库">
            <el-input
              v-model="customWordsInput"
              type="textarea"
              :rows="3"
              placeholder="输入词汇，每行一个或用逗号分隔，例如：&#10;Dragon, Phoenix, Tiger&#10;或每行一个词"
            />
            <div style="color: #909399; font-size: 12px; margin-top: 5px;">
              当前词库: {{ customWordsList.length }} 个词
            </div>
          </el-form-item>
          
          <el-form-item label="组合词数">
            <el-slider v-model="wordCount" :min="2" :max="4" :marks="{ 2: '2', 3: '3', 4: '4' }" />
          </el-form-item>
        </template>

        <!-- 随机字符模式选项 -->
        <el-form-item v-if="usernameMode === 'random'" label="字符长度">
          <el-slider v-model="randomLength" :min="6" :max="12" :marks="{ 6: '6', 8: '8', 10: '10', 12: '12' }" />
        </el-form-item>

        <!-- 数字后缀选项 -->
        <el-form-item label="添加数字后缀">
          <el-switch v-model="addNumber" />
          <template v-if="addNumber">
            <el-input-number
              v-model="numberDigits"
              :min="2"
              :max="6"
              style="margin-left: 10px; width: 120px;"
            />
            <span style="margin-left: 5px; color: #909399; font-size: 12px;">位数字</span>
          </template>
        </el-form-item>

        <el-divider />

        <el-form-item label="邮箱域名">
          <el-input
            v-model="emailDomain"
            placeholder="例如: mailto.plus"
          >
            <template #prepend>@</template>
          </el-input>
          <div style="color: #909399; font-size: 12px; margin-top: 5px;">
            可选，留空则不生成邮箱
          </div>
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="generateAccount" :loading="generating">
            生成账户信息
          </el-button>
          <el-button @click="previewUsername" :disabled="generating">
            预览用户名
          </el-button>
        </el-form-item>
        
        <el-form-item v-if="previewedUsername" label="预览">
          <el-tag type="success" size="large">{{ previewedUsername }}</el-tag>
          <el-button 
            size="small" 
            :icon="Refresh" 
            @click="previewUsername" 
            style="margin-left: 10px;"
          >
            换一个
          </el-button>
        </el-form-item>
      </el-form>

      <div v-if="generatedAccount" class="generated-info">
        <el-alert
          title="账户信息已生成"
          type="success"
          :closable="false"
          style="margin-bottom: 15px;"
        />
        
        <el-descriptions :column="1" border>
          <el-descriptions-item label="用户名">
            <div class="copy-field">
              <span>{{ generatedAccount.username }}</span>
              <el-button
                size="small"
                :icon="DocumentCopy"
                @click="copyToClipboard(generatedAccount.username, '用户名')"
              />
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="密码">
            <div class="copy-field">
              <span>{{ generatedAccount.password }}</span>
              <el-button
                size="small"
                :icon="DocumentCopy"
                @click="copyToClipboard(generatedAccount.password, '密码')"
              />
            </div>
          </el-descriptions-item>
          <el-descriptions-item v-if="generatedAccount.email" label="邮箱">
            <div class="copy-field">
              <span>{{ generatedAccount.email }}</span>
              <el-button
                size="small"
                :icon="DocumentCopy"
                @click="copyToClipboard(generatedAccount.email, '邮箱')"
              />
            </div>
          </el-descriptions-item>
        </el-descriptions>

        <div style="margin-top: 20px;">
          <el-button type="primary" @click="openSteamRegister">
            打开Steam注册页面
          </el-button>
          <el-button @click="saveGeneratedAccount" :loading="saving">
            保存到待激活列表
          </el-button>
        </div>

        <el-alert
          title="操作说明"
          type="info"
          :closable="false"
          style="margin-top: 15px;"
        >
          <ol style="margin: 5px 0; padding-left: 20px;">
            <li>点击"打开Steam注册页面"会在新窗口打开Steam注册</li>
            <li>使用生成的用户名、密码和邮箱完成注册</li>
            <li>手动完成验证码和邮箱验证</li>
            <li>注册完成后，点击"保存到待激活列表"</li>
            <li>使用SDA工具获取mafile文件</li>
            <li>在待激活列表中点击"激活"上传mafile</li>
          </ol>
        </el-alert>
      </div>
    </el-dialog>

    <!-- 激活账户对话框 -->
    <el-dialog
      v-model="activateDialogVisible"
      title="激活Steam账户"
      width="500px"
    >
      <el-form :model="activateForm" label-width="100px">
        <el-form-item label="用户名">
          <el-input v-model="activateForm.username" disabled />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="activateForm.description" placeholder="可选，账户描述" />
        </el-form-item>
        <el-form-item label="mafile文件">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :limit="1"
            accept=".mafile"
            :on-change="handleFileChange"
          >
            <template #trigger>
              <el-button type="primary">选择mafile文件</el-button>
            </template>
            <template #tip>
              <div class="el-upload__tip">
                请上传从SDA导出的.mafile文件
              </div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item label="验证码图片">
          <el-upload
            ref="imageUploadRef"
            :auto-upload="false"
            :limit="1"
            accept="image/*"
            :on-change="handleImageChange"
            list-type="picture-card"
          >
            <el-icon><Upload /></el-icon>
            <template #tip>
              <div class="el-upload__tip">
                可选：上传Steam注册验证码截图
              </div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="activateDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="activateAccount" :loading="activating">
          激活并添加到账户列表
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { DocumentCopy, Upload, View, Hide, Refresh } from '@element-plus/icons-vue'
import axios from '@/utils/axios'
import { generateUsername, getDefaultWordList } from '@/utils/usernameGenerator'

const accounts = ref([])
const showPasswords = reactive({})
const generateDialogVisible = ref(false)
const activateDialogVisible = ref(false)
const emailDomain = ref('')
const generating = ref(false)
const saving = ref(false)
const activating = ref(false)
const generatedAccount = ref(null)
const uploadRef = ref(null)
const imageUploadRef = ref(null)
const verificationImage = ref(null)

// 用户名生成相关
const usernameMode = ref('wordlist')
const useCustomWords = ref(false)
const customWordsInput = ref('')
const wordCount = ref(2)
const randomLength = ref(8)
const addNumber = ref(false)
const numberDigits = ref(4)
const previewedUsername = ref('')

// 计算自定义词库列表
const customWordsList = computed(() => {
  if (!customWordsInput.value.trim()) return []
  
  // 支持逗号分隔或换行分隔
  const words = customWordsInput.value
    .split(/[,\n]+/)
    .map(w => w.trim())
    .filter(w => w.length > 0)
  
  return words
})

const activateForm = reactive({
  id: null,
  username: '',
  description: '',
  mafile: null,
  verificationImage: null
})

const fetchAccounts = async () => {
  try {
    const response = await axios.get('/api/admin/pending-accounts')
    accounts.value = response.data.accounts
  } catch (error) {
    console.error('Failed to fetch accounts:', error)
    ElMessage.error('获取账户列表失败')
  }
}

const showGenerateDialog = () => {
  generatedAccount.value = null
  emailDomain.value = ''
  previewedUsername.value = ''
  usernameMode.value = 'wordlist'
  useCustomWords.value = false
  customWordsInput.value = ''
  wordCount.value = 2
  randomLength.value = 8
  addNumber.value = false
  numberDigits.value = 4
  generateDialogVisible.value = true
}

const previewUsername = () => {
  try {
    const options = {
      mode: usernameMode.value,
      customWords: useCustomWords.value ? customWordsList.value : null,
      wordCount: wordCount.value,
      length: randomLength.value,
      addNumber: addNumber.value,
      numberDigits: numberDigits.value
    }
    
    previewedUsername.value = generateUsername(options)
  } catch (error) {
    ElMessage.error(error.message || '生成失败')
  }
}

const generateAccount = async () => {
  generating.value = true
  try {
    // 生成用户名
    const options = {
      mode: usernameMode.value,
      customWords: useCustomWords.value ? customWordsList.value : null,
      wordCount: wordCount.value,
      length: randomLength.value,
      addNumber: addNumber.value,
      numberDigits: numberDigits.value
    }
    
    const username = generateUsername(options)
    
    const response = await axios.post('/api/admin/pending-accounts/generate', {
      emailDomain: emailDomain.value || null,
      username: username
    })
    generatedAccount.value = response.data
    
    // 自动保存到数据库
    await axios.post('/api/admin/pending-accounts', {
      username: response.data.username,
      password: response.data.password,
      email: response.data.email,
      notes: '通过生成工具创建'
    })
    
    ElMessage.success('账户信息已生成并保存')
    // 延迟关闭对话框，让用户看到生成的信息
    setTimeout(() => {
      generateDialogVisible.value = false
      fetchAccounts()
    }, 3000)
  } catch (error) {
    console.error('Failed to generate account:', error)
    ElMessage.error('生成账户信息失败')
  } finally {
    generating.value = false
  }
}

const openSteamRegister = () => {
  window.open('https://store.steampowered.com/join/', '_blank', 'noopener,noreferrer')
}

const saveGeneratedAccount = async () => {
  if (!generatedAccount.value) return
  
  saving.value = true
  try {
    await axios.post('/api/admin/pending-accounts', {
      username: generatedAccount.value.username,
      password: generatedAccount.value.password,
      email: generatedAccount.value.email,
      notes: '通过生成工具创建'
    })
    ElMessage.success('已保存到待激活列表')
    generateDialogVisible.value = false
    fetchAccounts()
  } catch (error) {
    console.error('Failed to save account:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const showActivateDialog = (account) => {
  activateForm.id = account.id
  activateForm.username = account.username
  activateForm.description = ''
  activateForm.mafile = null
  activateForm.verificationImage = null
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
  if (imageUploadRef.value) {
    imageUploadRef.value.clearFiles()
  }
  activateDialogVisible.value = true
}

const handleFileChange = (file) => {
  activateForm.mafile = file.raw
}

const handleImageChange = (file) => {
  activateForm.verificationImage = file.raw
}

const activateAccount = async () => {
  if (!activateForm.mafile) {
    ElMessage.warning('请选择mafile文件')
    return
  }
  
  activating.value = true
  try {
    const formData = new FormData()
    formData.append('sdaFile', activateForm.mafile)
    formData.append('description', activateForm.description)
    
    // 先上传mafile到Steam账户
    const uploadResponse = await axios.post('/api/admin/steam-accounts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    
    // 标记为已激活，同时上传验证码图片
    const activateFormData = new FormData()
    activateFormData.append('steamAccountId', uploadResponse.data.accountId)
    if (activateForm.verificationImage) {
      activateFormData.append('verificationImage', activateForm.verificationImage)
    }
    
    await axios.post(`/api/admin/pending-accounts/${activateForm.id}/activate`, activateFormData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    
    ElMessage.success('账户激活成功')
    activateDialogVisible.value = false
    fetchAccounts()
  } catch (error) {
    console.error('Failed to activate account:', error)
    ElMessage.error('激活失败: ' + (error.response?.data?.error || error.message))
  } finally {
    activating.value = false
  }
}

const deleteAccount = async (id) => {
  try {
    await ElMessageBox.confirm('确定删除此账户吗？', '确认删除', {
      type: 'warning'
    })
    
    await axios.delete(`/api/admin/pending-accounts/${id}`)
    ElMessage.success('删除成功')
    fetchAccounts()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete account:', error)
      ElMessage.error('删除失败')
    }
  }
}

const togglePassword = (id) => {
  showPasswords[id] = !showPasswords[id]
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
  fetchAccounts()
})
</script>

<style scoped>
.pending-accounts {
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

.accounts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.account-card {
  transition: all 0.3s;
}

.account-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header .username {
  font-weight: bold;
  font-size: 16px;
}

.account-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-item label {
  font-weight: 500;
  min-width: 90px;
  color: #606266;
}

.value-with-copy {
  display: flex;
  gap: 8px;
  align-items: center;
  flex: 1;
}

.value-with-copy span {
  flex: 1;
  word-break: break-all;
}

.card-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.generated-info {
  margin-top: 20px;
}

.copy-field {
  display: flex;
  gap: 10px;
  align-items: center;
}

.copy-field span {
  flex: 1;
}

.register-hint {
  margin-top: 20px;
  padding: 15px;
  background-color: #f0f9ff;
  border-radius: 4px;
  border-left: 4px solid #409eff;
}

.register-hint h4 {
  margin: 0 0 10px 0;
  color: #409eff;
}

.register-hint ol {
  margin: 10px 0;
  padding-left: 20px;
}

.register-hint li {
  margin: 5px 0;
}

.password-cell {
  display: flex;
  align-items: center;
  gap: 5px;
}

.copy-field {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: space-between;
}

.copy-field span {
  font-family: Consolas, monospace;
  word-break: break-all;
}
</style>
