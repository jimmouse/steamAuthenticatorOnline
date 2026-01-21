<template>
  <div class="batch-import">
    <el-card>
      <template #header>
        <h3>批量导入 Steam 账户</h3>
      </template>

      <el-alert
        title="CSV 文件格式说明"
        type="info"
        :closable="false"
        style="margin-bottom: 20px;"
      >
        <p><strong>必填字段：</strong></p>
        <ul>
          <li><code>s_name</code> - Steam用户名</li>
          <li><code>s_pass</code> - Steam密码</li>
          <li><code>mafile_content</code> - mafile文件的完整JSON内容</li>
        </ul>
        <p style="margin-top: 10px;"><strong>可选字段：</strong></p>
        <ul>
          <li><code>description</code> - 账户描述（默认使用s_name）</li>
          <li><code>email</code> - 邮箱地址</li>
          <li><code>e_pass</code> - 邮箱密码</li>
          <li><code>e_url</code> - 邮箱登录地址</li>
        </ul>
      </el-alert>

      <el-upload
        ref="uploadRef"
        :auto-upload="false"
        :limit="1"
        accept=".csv"
        :on-change="handleFileChange"
        :on-exceed="handleExceed"
        drag
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">
          拖拽 CSV 文件到此处或 <em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            只支持 .csv 格式文件
          </div>
        </template>
      </el-upload>

      <div v-if="selectedFile" style="margin-top: 20px;">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="文件名">{{ selectedFile.name }}</el-descriptions-item>
          <el-descriptions-item label="文件大小">{{ formatFileSize(selectedFile.size) }}</el-descriptions-item>
        </el-descriptions>

        <div style="margin-top: 20px; display: flex; gap: 10px;">
          <el-button type="primary" @click="handleUpload" :loading="uploading">
            开始导入
          </el-button>
          <el-button @click="clearFile">清除文件</el-button>
          <el-button type="success" @click="downloadTemplate">
            下载CSV模板
          </el-button>
        </div>
      </div>

      <div v-if="importResult" style="margin-top: 30px;">
        <el-divider>导入结果</el-divider>
        
        <el-result
          :icon="importResult.results.failed === 0 ? 'success' : 'warning'"
          :title="getResultTitle()"
        >
          <template #sub-title>
            <div style="margin-top: 10px;">
              <p>总计: {{ importResult.results.total }} 条</p>
              <p style="color: #67c23a;">成功: {{ importResult.results.success }} 条</p>
              <p style="color: #f56c6c;">失败: {{ importResult.results.failed }} 条</p>
            </div>
          </template>
        </el-result>

        <div v-if="importResult.results.errors.length > 0" style="margin-top: 20px;">
          <h4>错误详情：</h4>
          <el-table :data="importResult.results.errors" style="width: 100%; margin-top: 10px;">
            <el-table-column prop="row" label="行号" width="100" />
            <el-table-column prop="error" label="错误信息" />
          </el-table>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import axios from '@/utils/axios'

const uploadRef = ref(null)
const selectedFile = ref(null)
const uploading = ref(false)
const importResult = ref(null)

const handleFileChange = (file) => {
  selectedFile.value = file.raw
  importResult.value = null
}

const handleExceed = () => {
  ElMessage.warning('只能上传一个文件')
}

const clearFile = () => {
  selectedFile.value = null
  importResult.value = null
  uploadRef.value.clearFiles()
}

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

const handleUpload = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择文件')
    return
  }

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('csvFile', selectedFile.value)

    const response = await axios.post('/api/admin/steam-accounts/batch-import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    importResult.value = response.data
    
    if (response.data.results.failed === 0) {
      ElMessage.success('批量导入成功！')
    } else {
      ElMessage.warning(`导入完成，但有 ${response.data.results.failed} 条失败`)
    }
  } catch (error) {
    console.error('Upload failed:', error)
    ElMessage.error('批量导入失败：' + (error.response?.data?.message || error.message))
  } finally {
    uploading.value = false
  }
}

const getResultTitle = () => {
  if (!importResult.value) return ''
  const { success, failed } = importResult.value.results
  if (failed === 0) {
    return `成功导入 ${success} 个账户！`
  } else {
    return `导入完成：${success} 个成功，${failed} 个失败`
  }
}

const downloadTemplate = () => {
  const template = `s_name,s_pass,mafile_content,description,email,e_pass,e_url
example_user,example_pass,"{""shared_secret"":""ABCD1234"",""identity_secret"":""EFGH5678""}",示例账户,user@example.com,email_pass,https://mail.example.com`
  
  const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'steam_accounts_template.csv'
  link.click()
  URL.revokeObjectURL(link.href)
  
  ElMessage.success('模板已下载')
}
</script>

<style scoped>
.batch-import {
  padding: 20px;
}

.el-upload__tip {
  color: #909399;
  font-size: 12px;
  margin-top: 7px;
}

code {
  background-color: #f5f7fa;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: Consolas, monospace;
  color: #e6a23c;
}

ul {
  margin: 10px 0;
  padding-left: 20px;
}

li {
  margin: 5px 0;
}
</style>
