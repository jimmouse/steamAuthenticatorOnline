<template>
  <div class="accounts-preview">
    <h3>账户预览（简化版）</h3>
    <div v-if="error" style="color: red; padding: 20px;">
      错误：{{ error }}
    </div>
    <div v-else-if="loading" style="padding: 20px;">
      加载中...
    </div>
    <div v-else>
      <p>账户数量：{{ allAccounts.length }}</p>
      <div v-for="account in allAccounts" :key="account.id" style="padding: 10px; border: 1px solid #ddd; margin: 10px 0;">
        <p>ID: {{ account.id }}</p>
        <p>名称: {{ account.account_name }}</p>
        <p>用户名: {{ account.username }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from '@/utils/axios'

const allAccounts = ref([])
const loading = ref(true)
const error = ref(null)

const fetchAllAccounts = async () => {
  try {
    console.log('开始获取账户列表...')
    const response = await axios.get('/api/admin/steam-accounts')
    console.log('API响应:', response)
    allAccounts.value = response.data.accounts || []
    console.log('账户列表:', allAccounts.value)
  } catch (err) {
    console.error('获取失败:', err)
    error.value = err.message || '未知错误'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchAllAccounts()
})
</script>

<style scoped>
.accounts-preview {
  padding: 20px;
}
</style>
