<template>
  <div class="pending-accounts">
    <div class="toolbar">
      <h3>未激活账户管理</h3>
      <el-button type="primary" @click="showGenerateDialog">
        生成新账户
      </el-button>
    </div>

    <el-table :data="accounts" stripe style="width: 100%">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="username" label="用户名" width="150" />
      <el-table-column prop="password" label="密码" width="180">
        <template #default="{ row }">
          <div class="password-cell">
            <span>{{ showPasswords[row.id] ? row.password : '••••••••' }}</span>
            <el-button
              size="small"
              :icon="showPasswords[row.id] ? Hide : View"
              @click="togglePassword(row.id)"
            />
            <el-button
              size="small"
              :icon="DocumentCopy"
              @click="copyToClipboard(row.password, '密码')"
            />
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="email" label="邮箱" width="200" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'activated' ? 'success' : 'warning'">
            {{ row.status === 'activated' ? '已激活' : '待激活' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="180">
        <template #default="{ row }">
          {{ new Date(row.created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) }}
        </template>
      </el-table-column>
      <el-table-column prop="notes" label="备注" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="row.status === 'pending'"
            size="small"
            type="success"
            @click="showActivateDialog(row)"
          >
            激活
          </el-button>
          <el-button
            size="small"
            type="danger"
            @click="deleteAccount(row.id)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 生成账户对话框 -->
    <el-dialog
      v-model="generateDialogVisible"
      title="生成Steam账户信息"
      width="600px"
    >
      <el-form label-width="100px">
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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DocumentCopy, View, Hide } from '@element-plus/icons-vue'
import axios from '@/utils/axios'

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

const activateForm = reactive({
  id: null,
  username: '',
  description: '',
  mafile: null
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
  generateDialogVisible.value = true
}

const generateAccount = async () => {
  generating.value = true
  try {
    const response = await axios.post('/api/admin/pending-accounts/generate', {
      emailDomain: emailDomain.value || null
    })
    generatedAccount.value = response.data
    ElMessage.success('账户信息已生成')
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
  activateDialogVisible.value = true
}

const handleFileChange = (file) => {
  activateForm.mafile = file.raw
}

const activateAccount = async () => {
  if (!activateForm.mafile) {
    ElMessage.warning('请选择mafile文件')
    return
  }
  
  activating.value = true
  try {
    const formData = new FormData()
    formData.append('file', activateForm.mafile)
    formData.append('description', activateForm.description)
    
    // 先上传mafile到Steam账户
    const uploadResponse = await axios.post('/api/admin/steam-accounts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    
    // 标记为已激活
    await axios.post(`/api/admin/pending-accounts/${activateForm.id}/activate`, {
      accountName: uploadResponse.data.account.account_name
    })
    
    ElMessage.success('账户激活成功')
    activateDialogVisible.value = false
    fetchAccounts()
  } catch (error) {
    console.error('Failed to activate account:', error)
    ElMessage.error('激活失败')
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

.password-cell {
  display: flex;
  align-items: center;
  gap: 5px;
}

.generated-info {
  margin-top: 20px;
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
