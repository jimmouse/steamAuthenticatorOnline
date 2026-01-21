<template>
  <div class="accounts-management">
    <div class="toolbar">
      <h3>Steam 账户管理</h3>
      <el-button type="primary" :icon="Plus" @click="showCreateDialog">
        添加账户
      </el-button>
    </div>

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
              <h3>{{ account.account_name }}</h3>
              <el-tag :type="account.is_active ? 'success' : 'info'" size="small">
                {{ account.is_active ? '启用' : '禁用' }}
              </el-tag>
            </div>
          </div>
        </template>
        
        <div class="account-details">
          <div class="detail-item">
            <span class="label">用户名：</span>
            <span class="value">{{ account.username }}</span>
          </div>
          <div class="detail-item">
            <span class="label">密码：</span>
            <span class="value">{{ account.password ? '••••••••' : '未设置' }}</span>
          </div>
          <div v-if="account.notes" class="detail-item notes-item">
            <div class="notes-header" @click="toggleNotes(account.id)">
              <span class="label">📝 备注</span>
              <el-icon class="expand-icon" :class="{ expanded: expandedNotes[account.id] }">
                <ArrowDown />
              </el-icon>
            </div>
            <div v-show="expandedNotes[account.id]" class="notes-content" v-html="account.notes"></div>
          </div>
          <div class="detail-item">
            <span class="label">创建时间：</span>
            <span class="value">{{ new Date(account.created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) }}</span>
          </div>
        </div>
        
        <template #footer>
          <div class="card-actions">
            <el-button size="small" @click="showEditDialog(account)">编辑</el-button>
            <el-popconfirm
              title="确定删除此账户吗？"
              @confirm="deleteAccount(account.id)"
            >
              <template #reference>
                <el-button size="small" type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </div>
        </template>
      </el-card>
    </div>

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
        <el-form-item label="描述" prop="description">
          <el-input v-model="formData.description" placeholder="可选，留空则使用 SDA 文件中的账户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="formData.password" type="password" placeholder="Steam 登录密码" />
        </el-form-item>
        <el-form-item label="邮箱地址">
          <el-input v-model="formData.emailAddress" placeholder="可选，Steam账户绑定的邮箱" />
        </el-form-item>
        <el-form-item label="邮箱登录地址">
          <el-input v-model="formData.emailLoginUrl" placeholder="可选，邮箱登录网址" />
        </el-form-item>
        <el-form-item label="邮箱密码">
          <el-input v-model="formData.emailPassword" type="password" placeholder="可选，邮箱登录密码" />
        </el-form-item>
        <el-form-item label="备注">
          <div class="editor-wrapper">
            <QuillEditor 
              v-model:content="formData.notes"
              contentType="html"
              theme="snow"
              placeholder="可选，添加账户相关备注信息（支持富文本格式）"
              :toolbar="editorToolbar"
            />
          </div>
        </el-form-item>
        <el-form-item label="卡片颜色" prop="colorType">
          <el-radio-group v-model="formData.colorType">
            <el-radio value="solid">单色</el-radio>
            <el-radio value="gradient">渐变</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="formData.colorType === 'solid'" label="颜色值">
          <el-color-picker v-model="formData.colorValue" />
        </el-form-item>
        <el-form-item v-if="formData.colorType === 'gradient'" label="渐变色">
          <div style="display: flex; gap: 10px; align-items: center;">
            <el-color-picker v-model="formData.gradientStart" />
            <span>到</span>
            <el-color-picker v-model="formData.gradientEnd" />
          </div>
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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, ArrowDown } from '@element-plus/icons-vue'
import axios from '@/utils/axios'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'

const accounts = ref([])
const dialogVisible = ref(false)
const dialogMode = ref('create')
const uploading = ref(false)
const formRef = ref(null)
const uploadRef = ref(null)
const expandedNotes = reactive({})

const editorToolbar = [
  ['bold', 'italic', 'underline', 'strike'],
  ['blockquote', 'code-block'],
  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
  [{ 'header': [1, 2, 3, false] }],
  ['link'],
  ['clean']
]
const formData = ref({
  id: null,
  description: '',
  password: '',
  sdaFile: null,
  is_active: true,
  colorType: 'solid',
  colorValue: '#409eff',
  gradientStart: '#667eea',
  gradientEnd: '#764ba2'
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
    description: '',
    password: '',
    notes: '',
    sdaFile: null,
    is_active: true,
    colorType: 'solid',
    colorValue: '#409eff',
    gradientStart: '#667eea',
    gradientEnd: '#764ba2'
  }
  dialogVisible.value = true
}

const showEditDialog = (account) => {
  dialogMode.value = 'edit'
  const gradientColors = account.color_gradient ? account.color_gradient.split(',') : ['#667eea', '#764ba2']
  formData.value = {
    id: account.id,
    description: account.account_name,
    password: '',
    notes: account.notes || '',
    emailAddress: account.email_address || '',
    emailLoginUrl: account.email_login_url || '',
    emailPassword: '',
    sdaFile: null,
    is_active: account.is_active === 1,
    colorType: account.color_type || 'solid',
    colorValue: account.color_value || '#409eff',
    gradientStart: gradientColors[0],
    gradientEnd: gradientColors[1]
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
        const submitData = new FormData()
        submitData.append('file', formData.value.sdaFile)
        submitData.append('description', formData.value.description)
        submitData.append('password', formData.value.password)
        submitData.append('notes', formData.value.notes)
        if (formData.value.emailAddress) submitData.append('email_address', formData.value.emailAddress)
        if (formData.value.emailLoginUrl) submitData.append('email_login_url', formData.value.emailLoginUrl)
        if (formData.value.emailPassword) submitData.append('email_password', formData.value.emailPassword)
        submitData.append('colorType', formData.value.colorType)
        
        if (formData.value.colorType === 'solid') {
          submitData.append('colorValue', formData.value.colorValue)
        } else {
          submitData.append('colorGradient', `${formData.value.gradientStart},${formData.value.gradientEnd}`)
        }
        
        await axios.post('/api/admin/steam-accounts', submitData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        ElMessage.success('Steam 账户添加成功')
      } else {
        const data = {
          description: formData.value.description,
          is_active: formData.value.is_active,
          colorType: formData.value.colorType,
          notes: formData.value.notes
        }
        if (formData.value.password) {
          data.password = formData.value.password
        }
        if (formData.value.colorType === 'solid') {
          data.colorValue = formData.value.colorValue
          data.colorGradient = null
        } else {
          data.colorGradient = `${formData.value.gradientStart},${formData.value.gradientEnd}`
          data.colorValue = null
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

const getCardBannerStyle = (account) => {
  if (account.color_type === 'gradient' && account.color_gradient) {
    const colors = account.color_gradient.split(',')
    return {
      background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`
    }
  } else {
    return {
      background: account.color_value || '#409eff'
    }
  }
}

const toggleNotes = (accountId) => {
  expandedNotes[accountId] = !expandedNotes[accountId]
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

.accounts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
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
  justify-content: space-between;
  align-items: center;
}

.banner-content h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.account-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 10px 0;
}

.detail-item {
  display: flex;
  align-items: center;
}

.detail-item .label {
  font-weight: 500;
  color: #606266;
  min-width: 80px;
}

.detail-item .value {
  color: #303133;
  font-family: monospace;
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

.card-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.editor-wrapper {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.editor-wrapper :deep(.ql-container) {
  height: 150px;
  font-family: 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}

.editor-wrapper :deep(.ql-editor) {
  min-height: 150px;
  max-height: 300px;
  overflow-y: auto;
}

.editor-wrapper :deep(.ql-toolbar) {
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
}
</style>
