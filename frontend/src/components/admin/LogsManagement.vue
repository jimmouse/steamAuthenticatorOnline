<template>
  <div class="logs-management">
    <div class="toolbar">
      <h3>登录日志</h3>
      <div class="filters">
        <el-select
          v-model="selectedUserId"
          placeholder="筛选用户"
          clearable
          style="width: 200px; margin-right: 10px"
          @change="fetchLogs"
        >
          <el-option
            v-for="user in users"
            :key="user.id"
            :label="user.username"
            :value="user.id"
          />
        </el-select>
        <el-select v-model="filters.days" placeholder="时间范围" style="width: 150px" @change="fetchLogs">
          <el-option label="最近7天" :value="7" />
          <el-option label="最近30天" :value="30" />
          <el-option label="最近90天" :value="90" />
        </el-select>
        <el-input
          v-model="filters.user"
          placeholder="搜索用户名"
          style="width: 200px; margin-left: 10px"
          clearable
          @change="fetchLogs"
        />
        <el-dropdown @command="handleCleanLogs" style="margin-left: 10px">
          <el-button type="warning">
            清理日志 <el-icon class="el-icon--right"><arrow-down /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="7">清理7天前的日志</el-dropdown-item>
              <el-dropdown-item command="30">清理30天前的日志</el-dropdown-item>
              <el-dropdown-item command="90">清理90天前的日志</el-dropdown-item>
              <el-dropdown-item command="all" divided>清理所有日志</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button :icon="Refresh" @click="fetchLogs">刷新</el-button>
      </div>
    </div>

    <el-table :data="logs" stripe style="width: 100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="username" label="用户名" width="150" />
      <el-table-column prop="ip_address" label="IP 地址" width="150" />
      <el-table-column prop="user_agent" label="User Agent" min-width="300" show-overflow-tooltip />
      <el-table-column prop="login_time" label="登录时间" width="180" />
      <el-table-column prop="success" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.success ? 'success' : 'danger'">
            {{ row.success ? '成功' : '失败' }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="totalLogs"
        layout="total, prev, pager, next"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, ArrowDown } from '@element-plus/icons-vue'
import axios from '@/utils/axios'

const logs = ref([])
const users = ref([])
const selectedUserId = ref(null)
const currentPage = ref(1)
const pageSize = ref(50)
const totalLogs = ref(0)
const loading = ref(false)
const filters = reactive({
  days: 30,
  user: ''
})

const fetchLogs = async () => {
  try {
    const params = {
      limit: pageSize.value
    }
    if (selectedUserId.value) {
      params.userId = selectedUserId.value
    }
    
    const response = await axios.get('/api/admin/logs', { params })
    logs.value = response.data.logs
    totalLogs.value = response.data.logs.length
  } catch (error) {
    console.error('Failed to fetch logs:', error)
    ElMessage.error('获取日志失败')
  } finally {
    loading.value = false
  }
}

const fetchUsers = async () => {
  try {
    const response = await axios.get('/api/admin/users')
    users.value = response.data.users
  } catch (error) {
    console.error('Failed to fetch users:', error)
  }
}

const handlePageChange = (page) => {
  currentPage.value = page
  fetchLogs()
}

const handleCleanLogs = async (command) => {
  let confirmMessage = ''
  let days = null
  let isAll = false

  if (command === 'all') {
    confirmMessage = '确定要清理所有登录日志吗？此操作不可恢复！'
    isAll = true
  } else {
    days = parseInt(command)
    confirmMessage = `确定要清理 ${days} 天前的登录日志吗？`
  }

  try {
    await ElMessageBox.confirm(confirmMessage, '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const endpoint = isAll ? '/api/admin/logs/all' : '/api/admin/logs'
    const response = await axios.delete(endpoint, {
      data: isAll ? {} : { days }
    })

    ElMessage.success(`成功清理 ${response.data.deletedCount} 条日志`)
    fetchLogs()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to clean logs:', error)
      ElMessage.error('清理日志失败')
    }
  }
}

onMounted(() => {
  fetchLogs()
  fetchUsers()
})
</script>

<style scoped>
.logs-management {
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

.filters {
  display: flex;
  align-items: center;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
</style>
