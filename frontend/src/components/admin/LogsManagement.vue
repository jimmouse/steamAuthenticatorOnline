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
import { ref, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import axios from '@/utils/axios'

const logs = ref([])
const users = ref([])
const selectedUserId = ref(null)
const currentPage = ref(1)
const pageSize = ref(50)
const totalLogs = ref(0)

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
