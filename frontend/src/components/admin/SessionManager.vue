<template>
  <div class="session-manager">
    <el-dialog
      v-model="visible"
      title="更新Steam会话"
      width="600px"
      @close="handleClose"
    >
      <el-alert
        title="什么是Steam会话？"
        type="info"
        :closable="false"
        style="margin-bottom: 20px"
      >
        <p>Steam会话（Session）是Steam确认功能所需的登录凭证。</p>
        <p>更新会话后，您就可以在线查看和处理Steam交易确认了。</p>
      </el-alert>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="从浏览器获取" name="browser">
          <div class="instructions">
            <h4>📋 操作步骤：</h4>
            <ol>
              <li>在浏览器中登录 <a href="https://steamcommunity.com" target="_blank">steamcommunity.com</a></li>
              <li>按 <kbd>F12</kbd> 打开开发者工具</li>
              <li>切换到 <strong>Application</strong> 或 <strong>存储</strong> 标签</li>
              <li>展开 <strong>Cookies</strong> → <strong>https://steamcommunity.com</strong></li>
              <li>找到并复制以下Cookie的值：
                <ul>
                  <li><code>sessionid</code></li>
                  <li><code>steamLoginSecure</code></li>
                </ul>
              </li>
              <li>或者直接复制整个Cookie字符串</li>
            </ol>
          </div>

          <el-form :model="form" label-width="120px" style="margin-top: 20px">
            <el-form-item label="Cookie字符串">
              <el-input
                v-model="form.cookieString"
                type="textarea"
                :rows="4"
                placeholder="粘贴完整的Cookie字符串，例如：sessionid=xxx; steamLoginSecure=xxx"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="手动输入" name="manual">
          <el-form :model="form" label-width="150px">
            <el-form-item label="SessionID">
              <el-input v-model="form.sessionId" placeholder="从Cookie中复制sessionid的值" />
            </el-form-item>
            <el-form-item label="SteamLoginSecure">
              <el-input v-model="form.steamLoginSecure" placeholder="从Cookie中复制steamLoginSecure的值" />
            </el-form-item>
            <el-form-item label="Steam ID">
              <el-input v-model="form.steamId" placeholder="64位Steam ID（可选，会自动从steamLoginSecure提取）" />
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          更新会话
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import axios from '@/utils/axios'

const props = defineProps({
  accountId: {
    type: Number,
    required: true
  },
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = ref(props.modelValue)
const activeTab = ref('browser')
const submitting = ref(false)

const form = reactive({
  cookieString: '',
  sessionId: '',
  steamLoginSecure: '',
  steamId: ''
})

const handleClose = () => {
  visible.value = false
  emit('update:modelValue', false)
  // 重置表单
  form.cookieString = ''
  form.sessionId = ''
  form.steamLoginSecure = ''
  form.steamId = ''
}

const handleSubmit = async () => {
  submitting.value = true
  try {
    let requestData = {}

    if (activeTab.value === 'browser' && form.cookieString) {
      requestData.cookieString = form.cookieString
    } else if (activeTab.value === 'manual') {
      if (!form.sessionId || !form.steamLoginSecure) {
        ElMessage.error('请填写SessionID和SteamLoginSecure')
        return
      }
      requestData.sessionData = {
        SessionID: form.sessionId,
        SteamLoginSecure: form.steamLoginSecure,
        SteamID: form.steamId || null
      }
    } else {
      ElMessage.error('请输入Cookie字符串或手动填写Session数据')
      return
    }

    await axios.post(`/api/admin/steam-accounts/${props.accountId}/session`, requestData)
    
    ElMessage.success('Steam会话更新成功！现在可以查看确认了')
    emit('success')
    handleClose()
  } catch (error) {
    console.error('Failed to update session:', error)
    ElMessage.error(error.response?.data?.message || '更新会话失败')
  } finally {
    submitting.value = false
  }
}

// 监听props变化
import { watch } from 'vue'
watch(() => props.modelValue, (val) => {
  visible.value = val
})
</script>

<style scoped>

.instructions {
  background: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  line-height: 1.8;
}

.instructions h4 {
  margin-top: 0;
  color: #409eff;
}

.instructions ol {
  margin: 10px 0;
  padding-left: 20px;
}

.instructions li {
  margin: 8px 0;
}

.instructions ul {
  margin: 5px 0;
  padding-left: 20px;
}

.instructions code {
  background: #e7e7e7;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: Consolas, monospace;
  color: #e96900;
}

.instructions kbd {
  background: #333;
  color: #fff;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: Consolas, monospace;
  font-size: 12px;
}

.instructions a {
  color: #409eff;
  text-decoration: none;
}

.instructions a:hover {
  text-decoration: underline;
}
</style>
