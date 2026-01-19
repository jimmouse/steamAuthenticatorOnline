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
            <el-menu-item index="users">
              <el-icon><User /></el-icon>
              <span>用户管理</span>
            </el-menu-item>
            <el-menu-item index="accounts">
              <el-icon><Postcard /></el-icon>
              <span>Steam账户</span>
            </el-menu-item>
            <el-menu-item index="permissions">
              <el-icon><Key /></el-icon>
              <span>权限管理</span>
            </el-menu-item>
            <el-menu-item index="logs">
              <el-icon><Document /></el-icon>
              <span>登录日志</span>
            </el-menu-item>
            <el-menu-item index="api-keys">
              <el-icon><Key /></el-icon>
              <span>API Key 管理</span>
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
import { UserFilled, User, Postcard, Key, Document } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import UsersManagement from '@/components/admin/UsersManagement.vue'
import AccountsManagement from '@/components/admin/AccountsManagement.vue'
import PermissionsManagement from '@/components/admin/PermissionsManagement.vue'
import LogsManagement from '@/components/admin/LogsManagement.vue'
import ApiKeysManagement from '@/components/admin/ApiKeysManagement.vue'

const router = useRouter()
const authStore = useAuthStore()

const activeMenu = ref('users')

const components = {
  users: UsersManagement,
  accounts: AccountsManagement,
  permissions: PermissionsManagement,
  logs: LogsManagement,
  'api-keys': ApiKeysManagement
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
