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
              <el-icon><User /></el-icon>
              <span>未激活账户</span>
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
import { UserFilled, User, Postcard, Key, Document, View, Setting, Upload } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import AccountsPreview from '@/components/admin/AccountsPreview.vue'
import UsersManagement from '@/components/admin/UsersManagement.vue'
import AccountsManagement from '@/components/admin/AccountsManagement.vue'
import PendingAccounts from '@/components/admin/PendingAccounts.vue'
import BatchImport from '@/components/admin/BatchImport.vue'
import PermissionsManagement from '@/components/admin/PermissionsManagement.vue'
import LogsManagement from '@/components/admin/LogsManagement.vue'
import SystemSettings from '@/components/admin/SystemSettings.vue'

const router = useRouter()
const authStore = useAuthStore()

const activeMenu = ref('preview')

const components = {
  preview: AccountsPreview,
  users: UsersManagement,
  accounts: AccountsManagement,
  pending: PendingAccounts,
  'batch-import': BatchImport,
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
  min-height: 100vh;
  background-color: #f5f7fa;
}

.header {
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.header-content h2 {
  margin: 0;
  color: #303133;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sidebar {
  background-color: #fff;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.05);
}

.el-menu {
  border-right: none;
}
</style>
