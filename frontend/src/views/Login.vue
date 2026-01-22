<template>
  <div class="login-container" :style="loginBgStyle">
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <h2>Steam取号器</h2>
        </div>
      </template>
      
      <el-tabs v-model="loginType" class="login-tabs">
        <el-tab-pane label="账号密码登录" name="password">
          <el-form
            ref="loginFormRef"
            :model="loginForm"
            :rules="passwordRules"
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
        </el-tab-pane>
        
        <el-tab-pane label="授权码登录" name="code">
          <el-form
            ref="codeFormRef"
            :model="codeForm"
            :rules="codeRules"
            label-width="80px"
            @submit.prevent="handleCodeLogin"
          >
            <el-form-item label="授权码" prop="accessCode">
              <el-input
                v-model="codeForm.accessCode"
                placeholder="请输入授权码"
                clearable
                @keyup.enter="handleCodeLogin"
              />
            </el-form-item>
            
            <el-form-item>
              <el-button
                type="primary"
                :loading="loading"
                style="width: 100%"
                @click="handleCodeLogin"
              >
                登录
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
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
const codeFormRef = ref(null)
const loading = ref(false)
const loginType = ref('password')
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

const codeForm = reactive({
  accessCode: ''
})

const passwordRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const codeRules = {
  accessCode: [{ required: true, message: '请输入授权码', trigger: 'blur' }]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  await loginFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    loading.value = true
    try {
      await authStore.login(loginForm.username, loginForm.password)
      ElMessage.success('登录成功')
      
      if (authStore.user.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Login failed:', error)
      ElMessage.error(error.response?.data?.error || '登录失败')
    } finally {
      loading.value = false
    }
  })
}

const handleCodeLogin = async () => {
  if (!codeFormRef.value) return
  
  await codeFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    loading.value = true
    try {
      await authStore.loginWithCode(codeForm.accessCode)
      ElMessage.success('登录成功')
      router.push('/dashboard')
    } catch (error) {
      console.error('Code login failed:', error)
      ElMessage.error(error.response?.data?.error || '授权码无效或已过期')
    } finally {
      loading.value = false
    }
  })
}

const fetchSettings = async () => {
  try {
    const response = await axios.get('/api/auth/settings')
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
