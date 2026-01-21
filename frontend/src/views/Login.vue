<template>
  <div class="login-container" :style="loginBgStyle">
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <h2>Steam取号器</h2>
        </div>
      </template>
      
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="rules"
        label-width="80px"
        @submit.prevent="handleLogin"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名"
            clearable
          />
        </el-form-item>
        
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            style="width: 100%"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import axios from 'axios'

const router = useRouter()
const authStore = useAuthStore()

const loginFormRef = ref(null)
const loading = ref(false)
const systemSettings = ref({
  login_bg_type: 'solid',
  login_bg_color: '#409eff',
  login_bg_gradient: null
})

const loginBgStyle = computed(() => {
  if (systemSettings.value.login_bg_type === 'gradient' && systemSettings.value.login_bg_gradient) {
    const colors = systemSettings.value.login_bg_gradient.split(',')
    return {
      background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`
    }
  } else {
    return {
      background: systemSettings.value.login_bg_color || '#409eff'
    }
  }
})

const loginForm = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  await loginFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    loading.value = true
    try {
      await authStore.login(loginForm.username, loginForm.password)
      ElMessage.success('登录成功')
      
      if (authStore.isAdmin) {
        router.push('/admin')
      } else {
        router.push('/user')
      }
    } catch (error) {
      console.error('Login error:', error)
      // 错误消息已由 axios 拦截器显示
      // 如果没有显示，这里作为备用
      if (!error.response && error.message) {
        ElMessage.error('连接失败：' + error.message)
      }
    } finally {
      loading.value = false
    }
  })
}

const fetchSettings = async () => {
  try {
    const response = await axios.get('http://localhost:3010/api/auth/settings')
    Object.assign(systemSettings.value, response.data.settings)
  } catch (error) {
    console.error('Failed to fetch settings:', error)
  }
}

onMounted(() => {
  fetchSettings()
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background 0.3s ease;
}

.login-card {
  width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.card-header {
  text-align: center;
}

.card-header h2 {
  margin: 0;
  color: #303133;
  font-size: 24px;
}
</style>
