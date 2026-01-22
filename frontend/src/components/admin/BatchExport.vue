<template>
  <div class="batch-export">
    <el-card>
      <template #header>
        <h3>批量导出账户信息</h3>
      </template>
      
      <el-form label-width="120px">
        <el-form-item label="导出格式">
          <el-radio-group v-model="exportFormat">
            <el-radio value="csv">CSV</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="包含字段">
          <el-checkbox-group v-model="selectedFields">
            <el-checkbox value="id">ID</el-checkbox>
            <el-checkbox value="account_name">账户名称</el-checkbox>
            <el-checkbox value="username">用户名</el-checkbox>
            <el-checkbox value="password">密码</el-checkbox>
            <el-checkbox value="email_address">邮箱地址</el-checkbox>
            <el-checkbox value="email_login_url">邮箱登录地址</el-checkbox>
            <el-checkbox value="email_password">邮箱密码</el-checkbox>
            <el-checkbox value="country">国家</el-checkbox>
            <el-checkbox value="province">省份</el-checkbox>
            <el-checkbox value="city">城市</el-checkbox>
            <el-checkbox value="shared_secret">Shared Secret</el-checkbox>
            <el-checkbox value="identity_secret">Identity Secret</el-checkbox>
            <el-checkbox value="is_active">状态</el-checkbox>
            <el-checkbox value="created_at">创建时间</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        
        <el-form-item label="筛选条件">
          <el-radio-group v-model="filterType">
            <el-radio value="all">全部账户</el-radio>
            <el-radio value="active">仅启用</el-radio>
            <el-radio value="inactive">仅禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="handleExport" :loading="exporting">
            <el-icon><Download /></el-icon>
            导出
          </el-button>
          <el-button @click="selectAllFields">全选字段</el-button>
          <el-button @click="clearFields">清空字段</el-button>
        </el-form-item>
      </el-form>
      
      <el-alert
        v-if="accountCount !== null"
        :title="`共 ${accountCount} 个账户符合条件`"
        type="info"
        :closable="false"
        style="margin-top: 20px;"
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import axios from '@/utils/axios'

const exportFormat = ref('csv')
const selectedFields = ref(['id', 'account_name', 'username', 'password', 'email_address', 'country', 'province', 'city', 'is_active', 'created_at'])
const filterType = ref('all')
const exporting = ref(false)
const accountCount = ref(null)

const allFields = [
  'id', 'account_name', 'username', 'password', 
  'email_address', 'email_login_url', 'email_password',
  'country', 'province', 'city',
  'shared_secret', 'identity_secret',
  'is_active', 'created_at'
]

const selectAllFields = () => {
  selectedFields.value = [...allFields]
}

const clearFields = () => {
  selectedFields.value = []
}

const fetchAccountCount = async () => {
  try {
    const response = await axios.get('/api/admin/steam-accounts/count', {
      params: { filter: filterType.value }
    })
    accountCount.value = response.data.count
  } catch (err) {
    console.error('获取账户数量失败:', err)
  }
}

const handleExport = async () => {
  if (selectedFields.value.length === 0) {
    ElMessage.warning('请至少选择一个字段')
    return
  }
  
  exporting.value = true
  try {
    const response = await axios.get('/api/admin/steam-accounts/export', {
      params: {
        format: exportFormat.value,
        fields: selectedFields.value.join(','),
        filter: filterType.value
      },
      responseType: 'blob'
    })
    
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.href = url
    link.download = `steam_accounts_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    
    ElMessage.success('导出成功')
  } catch (err) {
    console.error('导出失败:', err)
    ElMessage.error('导出失败: ' + (err.response?.data?.error || err.message))
  } finally {
    exporting.value = false
  }
}

watch(filterType, () => {
  fetchAccountCount()
})

onMounted(() => {
  fetchAccountCount()
})
</script>

<style scoped>
.batch-export {
  padding: 20px;
}

.el-checkbox-group {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
</style>
