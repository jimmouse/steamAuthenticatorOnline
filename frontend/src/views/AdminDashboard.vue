<template>
  <div class="admin-dashboard">
    <el-container>
      <el-header class="header">
        <div class="header-content">
          <h2>管理员控制台</h2>
          <div class="user-info">
            <el-icon><UserFilled /></el-icon>
            <span>{{ authStore.user?.username }}</span>
            <el-button type="danger" size="small" @click="handleLogout">
              退出登录
            </el-button>
          </div>
        </div>
      </el-header>
      
      <el-container>
        <el-aside width="200px" class="sidebar">
          <el-menu
            :default-active="activeMenu"
            @select="handleMenuSelect"
          >
            <el-menu-item index="preview">
              <el-icon><View /></el-icon>
              <span>预览</span>
            </el-menu-item>
            <el-menu-item index="users">
              <el-icon><User /></el-icon>
              <span>用户管理</span>
            </el-menu-item>
            <el-menu-item index="accounts">
              <el-icon><Postcard /></el-icon>
              <span>Steam账户</span>
            </el-menu-item>
            <el-menu-item index="pending">
              <el-icon><Clock /></el-icon>
              <span>待激活用户</span>
            </el-menu-item>
            <el-menu-item index="batch-import">
              <el-icon><Upload /></el-icon>
              <span>批量导入</span>
            </el-menu-item>
            <el-menu-item index="batch-export">
              <el-icon><Download /></el-icon>
              <span>批量导出</span>
            </el-menu-item>
            <el-menu-item index="temp-users">
              <el-icon><Key /></el-icon>
              <span>临时授权码</span>
            </el-menu-item>
            <el-menu-item index="permissions">
              <el-icon><Key /></el-icon>
              <span>权限管理</span>
            </el-menu-item>
            <el-menu-item index="logs">
              <el-icon><Document /></el-icon>
              <span>登录日志</span>
            </el-menu-item>
            <el-menu-item index="settings">
              <el-icon><Setting /></el-icon>
              <span>个性化设置</span>
            </el-menu-item>
          </el-menu>
        </el-aside>
        
        <el-main>
          <component :is="currentComponent" />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { UserFilled, User, Postcard, Key, Document, View, Setting, Upload, Download, Clock } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import AccountsPreview from '@/components/admin/AccountsPreview.vue'
import UsersManagement from '@/components/admin/UsersManagement.vue'
import AccountsManagement from '@/components/admin/AccountsManagement.vue'
import PendingAccounts from '@/components/admin/PendingAccounts.vue'
import BatchImport from '@/components/admin/BatchImport.vue'
import BatchExport from '@/components/admin/BatchExport.vue'
import TempUsers from '@/components/admin/TempUsers.vue'
import PermissionsManagement from '@/components/admin/PermissionsManagement.vue'
import LogsManagement from '@/components/admin/LogsManagement.vue'
import SystemSettings from '@/components/admin/SystemSettings.vue'

const router = useRouter()
const authStore = useAuthStore()

const activeMenu = ref('accounts')

const components = {
  preview: AccountsPreview,
  users: UsersManagement,
  accounts: AccountsManagement,
  pending: PendingAccounts,
  'batch-import': BatchImport,
  'batch-export': BatchExport,
  'temp-users': TempUsers,
  permissions: PermissionsManagement,
  logs: LogsManagement,
  settings: SystemSettings
}

const currentComponent = computed(() => components[activeMenu.value])

const handleMenuSelect = (index) => {
  activeMenu.value = index
}

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.admin-dashboard {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.admin-dashboard :deep(.el-container) {
  height: 100%;
}

.header {
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  padding: 0 20px;
  flex-shrink: 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.header h2 {
  margin: 0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sidebar {
  background: #fff;
  border-right: 1px solid #e8e8e8;
  height: calc(100vh - 60px);
  overflow-y: auto;
  flex-shrink: 0;
}

.sidebar :deep(.el-menu) {
  border-right: none;
  height: 100%;
}

.el-main {
  height: calc(100vh - 60px);
  overflow-y: auto;
}
</style>
