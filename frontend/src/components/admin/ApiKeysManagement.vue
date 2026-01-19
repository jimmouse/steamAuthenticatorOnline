<template>
  <div class="api-keys-management">
    <div class="toolbar">
      <h3>API Key 管理</h3>
      <el-button type="primary" :icon="Plus" @click="showCreateDialog">
        创建 API Key
      </el-button>
    </div>

    <el-table :data="apiKeys" stripe style="width: 100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="api_key" label="API Key" min-width="300">
        <template #default="{ row }">
          <div class="api-key-display">
            <el-input
              :value="row.api_key"
              readonly
              :ref="el => inputRefs[row.id] = el"
            >
              <template #append>
                <el-button
                  :icon="row.api_key_visible ? Hide : View"
                  @click="toggleApiKeyVisibility(row.id)"
                />
                <el-button
                  :icon="DocumentCopy"
                  @click="copyApiKey(row.api_key)"
                />
              </template>
            </el-input>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="created_by_username" label="创建者" width="120" />
      <el-table-column prop="created_at" label="创建时间" width="180" />
      <el-table-column prop="last_used_at" label="最后使用" width="180">
        <template #default="{ row }">
          <span>{{ row.last_used_at || '未使用' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="is_active" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.is_active ? 'success' : 'info'">
            {{ row.is_active ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="showEditDialog(row)">编辑</el-button>
          <el-popconfirm
            title="确定删除此 API Key 吗？"
            @confirm="deleteApiKey(row.id)"
          >
            <template #reference>
              <el-button size="small" type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '创建 API Key' : '编辑 API Key'"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="输入 API Key 名称" />
        </el-form-item>
        <el-form-item v-if="dialogMode === 'create'" label="提示">
          <el-alert
            type="warning"
            :closable="false"
            show-icon
          >
            <template #title>
              API Key 创建后只会显示一次，请妥善保管！
            </template>
          </el-alert>
        </el-form-item>
        <el-form-item v-if="dialogMode === 'edit'" label="状态">
          <el-switch
            v-model="form.is_active"
            active-text="启用"
            inactive-text="禁用"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 显示新创建的 API Key -->
    <el-dialog
      v-model="showApiKeyDialog"
      title="API Key 创建成功"
      width="600px"
    >
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 20px;"
      >
        <template #title>
          请立即复制并妥善保管此 API Key，关闭后将无法再次查看！
        </template>
      </el-alert>
      <el-input
        :value="newApiKey"
        readonly
        type="textarea"
        :rows="3"
      >
        <template #append>
          <el-button :icon="DocumentCopy" @click="copyApiKey(newApiKey)">
            复制
          </el-button>
        </template>
      </el-input>
      <template #footer>
        <el-button type="primary" @click="showApiKeyDialog = false">
          我已保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, DocumentCopy, View, Hide } from '@element-plus/icons-vue'
import axios from '@/utils/axios'

const apiKeys = ref([])
const dialogVisible = ref(false)
const showApiKeyDialog = ref(false)
const dialogMode = ref('create')
const formRef = ref(null)
const inputRefs = ref({})
const newApiKey = ref('')

const form = reactive({
  name: '',
  is_active: true
})

const rules = {
  name: [
    { required: true, message: '请输入名称', trigger: 'blur' }
  ]
}

const fetchApiKeys = async () => {
  try {
    const response = await axios.get('/api/admin/api-keys')
    apiKeys.value = response.data.apiKeys.map(key => ({
      ...key,
      api_key_visible: false
    }))
  } catch (error) {
    console.error('Failed to fetch API keys:', error)
    ElMessage.error('获取 API Key 列表失败')
  }
}

const showCreateDialog = () => {
  dialogMode.value = 'create'
  form.name = ''
  form.is_active = true
  dialogVisible.value = true
}

const showEditDialog = (row) => {
  dialogMode.value = 'edit'
  form.name = row.name
  form.is_active = row.is_active === 1
  form.id = row.id
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    try {
      if (dialogMode.value === 'create') {
        const response = await axios.post('/api/admin/api-keys', {
          name: form.name
        })
        newApiKey.value = response.data.api_key
        showApiKeyDialog.value = true
        dialogVisible.value = false
        ElMessage.success('API Key 创建成功')
      } else {
        await axios.put(`/api/admin/api-keys/${form.id}`, {
          name: form.name,
          is_active: form.is_active
        })
        ElMessage.success('API Key 更新成功')
        dialogVisible.value = false
      }
      fetchApiKeys()
    } catch (error) {
      console.error('Failed to save API key:', error)
      ElMessage.error('操作失败')
    }
  })
}

const deleteApiKey = async (id) => {
  try {
    await axios.delete(`/api/admin/api-keys/${id}`)
    ElMessage.success('API Key 删除成功')
    fetchApiKeys()
  } catch (error) {
    console.error('Failed to delete API key:', error)
    ElMessage.error('删除失败')
  }
}

const toggleApiKeyVisibility = (id) => {
  const key = apiKeys.value.find(k => k.id === id)
  if (key) {
    key.api_key_visible = !key.api_key_visible
    const input = inputRefs.value[id]
    if (input) {
      input.input.type = key.api_key_visible ? 'text' : 'password'
    }
  }
}

const copyApiKey = async (apiKey) => {
  try {
    await navigator.clipboard.writeText(apiKey)
    ElMessage.success('API Key 已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

onMounted(() => {
  fetchApiKeys()
})
</script>

<style scoped>
.api-keys-management {
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

.api-key-display {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>

