<template>
  <div class="accounts-management">
    <div class="header">
      <h3>Steam 账户</h3>
      <p class="desc">当前版本未提供独立的“账户管理”页面，这里展示账户列表（简化版）。</p>
    </div>

    <AccountsPreviewSimple />
  </div>
</template>

<script setup>
import AccountsPreviewSimple from '@/components/admin/AccountsPreviewSimple.vue'
</script>

<style scoped>
.accounts-management {
  padding: 20px;
}

.header {
  margin-bottom: 12px;
}

.header h3 {
  margin: 0 0 6px 0;
}

.desc {
  margin: 0;
  color: #909399;
  font-size: 13px;
}

.detail-item .label {
  font-weight: 500;
  color: var(--el-text-color-regular);
  min-width: 80px;
}
</style>
