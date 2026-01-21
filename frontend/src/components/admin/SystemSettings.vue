<template>
  <div class="system-settings">
    <div class="toolbar">
      <h3>个性化设置</h3>
      <el-button type="primary" @click="saveSettings" :loading="saving">
        保存设置
      </el-button>
    </div>

    <el-card class="settings-card">
      <template #header>
        <h4>主题模式</h4>
      </template>
      <el-radio-group v-model="settings.theme_mode">
        <el-radio label="light">浅色模式</el-radio>
        <el-radio label="dark">深色模式</el-radio>
      </el-radio-group>
    </el-card>

    <el-card class="settings-card">
      <template #header>
        <h4>用户界面背景</h4>
      </template>
      <div class="setting-group">
        <el-radio-group v-model="settings.user_bg_type">
          <el-radio label="solid">单色</el-radio>
          <el-radio label="gradient">渐变</el-radio>
        </el-radio-group>
        
        <div v-if="settings.user_bg_type === 'solid'" class="color-picker-group">
          <label>背景颜色：</label>
          <el-color-picker v-model="settings.user_bg_color" />
        </div>
        
        <div v-if="settings.user_bg_type === 'gradient'" class="gradient-picker-group">
          <label>渐变色：</label>
          <div class="gradient-colors">
            <el-color-picker v-model="userGradientStart" />
            <span>到</span>
            <el-color-picker v-model="userGradientEnd" />
          </div>
        </div>
        
        <div class="preview-box" :style="getUserBgStyle">
          <span>预览效果</span>
        </div>
      </div>
    </el-card>

    <el-card class="settings-card">
      <template #header>
        <h4>登录页面背景</h4>
      </template>
      <div class="setting-group">
        <el-radio-group v-model="settings.login_bg_type">
          <el-radio label="solid">单色</el-radio>
          <el-radio label="gradient">渐变</el-radio>
        </el-radio-group>
        
        <div v-if="settings.login_bg_type === 'solid'" class="color-picker-group">
          <label>背景颜色：</label>
          <el-color-picker v-model="settings.login_bg_color" />
        </div>
        
        <div v-if="settings.login_bg_type === 'gradient'" class="gradient-picker-group">
          <label>渐变色：</label>
          <div class="gradient-colors">
            <el-color-picker v-model="loginGradientStart" />
            <span>到</span>
            <el-color-picker v-model="loginGradientEnd" />
          </div>
        </div>
        
        <div class="preview-box" :style="getLoginBgStyle">
          <span>预览效果</span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from '@/utils/axios'

const settings = ref({
  theme_mode: 'light',
  user_bg_type: 'solid',
  user_bg_color: '#f5f7fa',
  user_bg_gradient: null,
  login_bg_type: 'solid',
  login_bg_color: '#409eff',
  login_bg_gradient: null
})

const saving = ref(false)
const userGradientStart = ref('#667eea')
const userGradientEnd = ref('#764ba2')
const loginGradientStart = ref('#667eea')
const loginGradientEnd = ref('#764ba2')

const getUserBgStyle = computed(() => {
  if (settings.value.user_bg_type === 'gradient') {
    return {
      background: `linear-gradient(135deg, ${userGradientStart.value} 0%, ${userGradientEnd.value} 100%)`
    }
  } else {
    return {
      background: settings.value.user_bg_color
    }
  }
})

const getLoginBgStyle = computed(() => {
  if (settings.value.login_bg_type === 'gradient') {
    return {
      background: `linear-gradient(135deg, ${loginGradientStart.value} 0%, ${loginGradientEnd.value} 100%)`
    }
  } else {
    return {
      background: settings.value.login_bg_color
    }
  }
})

const fetchSettings = async () => {
  try {
    const response = await axios.get('/api/admin/settings')
    Object.assign(settings.value, response.data.settings)
    
    if (settings.value.user_bg_gradient) {
      const colors = settings.value.user_bg_gradient.split(',')
      userGradientStart.value = colors[0]
      userGradientEnd.value = colors[1]
    }
    
    if (settings.value.login_bg_gradient) {
      const colors = settings.value.login_bg_gradient.split(',')
      loginGradientStart.value = colors[0]
      loginGradientEnd.value = colors[1]
    }
  } catch (error) {
    console.error('Failed to fetch settings:', error)
    ElMessage.error('获取设置失败')
  }
}

const saveSettings = async () => {
  saving.value = true
  try {
    const settingsToSave = { ...settings.value }
    
    if (settings.value.user_bg_type === 'gradient') {
      settingsToSave.user_bg_gradient = `${userGradientStart.value},${userGradientEnd.value}`
      settingsToSave.user_bg_color = null
    } else {
      settingsToSave.user_bg_gradient = null
    }
    
    if (settings.value.login_bg_type === 'gradient') {
      settingsToSave.login_bg_gradient = `${loginGradientStart.value},${loginGradientEnd.value}`
      settingsToSave.login_bg_color = null
    } else {
      settingsToSave.login_bg_gradient = null
    }
    
    await axios.put('/api/admin/settings', { settings: settingsToSave })
    ElMessage.success('设置保存成功')
  } catch (error) {
    console.error('Failed to save settings:', error)
    ElMessage.error('保存设置失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchSettings()
})
</script>

<style scoped>
.system-settings {
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

.settings-card {
  margin-bottom: 20px;
}

.settings-card h4 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.color-picker-group,
.gradient-picker-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.gradient-colors {
  display: flex;
  align-items: center;
  gap: 10px;
}

.preview-box {
  width: 100%;
  height: 120px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  border: 2px solid #dcdfe6;
}
</style>
