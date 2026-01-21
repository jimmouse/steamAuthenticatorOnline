<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import axios from 'axios'

const applyTheme = async () => {
  try {
    const response = await axios.get('http://localhost:3010/api/auth/settings')
    const themeMode = response.data.settings.theme_mode || 'light'
    
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  } catch (error) {
    console.error('Failed to load theme:', error)
  }
}

onMounted(() => {
  applyTheme()
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: Consolas, 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}

body {
  font-family: Consolas, 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  background-color: #f5f7fa;
}

#app {
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

input, textarea, button, select {
  font-family: Consolas, 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}

/* 深色模式样式 */
html.dark {
  color-scheme: dark;
}

html.dark body {
  background-color: #1a1a1a;
  color: #e0e0e0;
}

/* Element Plus 深色模式覆盖 */
html.dark .el-card {
  background-color: #2a2a2a;
  border-color: #3a3a3a;
  color: #e0e0e0;
}

html.dark .el-card__header {
  background-color: #2a2a2a;
  border-color: #3a3a3a;
  color: #e0e0e0;
}

html.dark .el-input__wrapper {
  background-color: #333;
  box-shadow: 0 0 0 1px #4a4a4a inset;
}

html.dark .el-input__inner {
  color: #e0e0e0;
  background-color: transparent;
}

html.dark .el-textarea__inner {
  background-color: #333;
  color: #e0e0e0;
  border-color: #4a4a4a;
}

html.dark .el-select .el-input__wrapper {
  background-color: #333;
}

html.dark .el-table {
  background-color: #2a2a2a;
  color: #e0e0e0;
}

html.dark .el-table th.el-table__cell {
  background-color: #333;
  color: #e0e0e0;
}

html.dark .el-table tr {
  background-color: #2a2a2a;
}

html.dark .el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell {
  background-color: #252525;
}

html.dark .el-table td.el-table__cell,
html.dark .el-table th.el-table__cell.is-leaf {
  border-color: #3a3a3a;
}

html.dark .el-menu {
  background-color: #2a2a2a;
  border-color: #3a3a3a;
}

html.dark .el-menu-item {
  color: #e0e0e0;
}

html.dark .el-menu-item:hover {
  background-color: #333;
}

html.dark .el-menu-item.is-active {
  background-color: #409eff;
  color: #fff;
}

html.dark .el-header {
  background-color: #2a2a2a;
  color: #e0e0e0;
  border-color: #3a3a3a;
}

html.dark .el-aside {
  background-color: #2a2a2a;
  border-color: #3a3a3a;
}

html.dark .el-main {
  background-color: #1a1a1a;
  color: #e0e0e0;
}

html.dark .el-dialog {
  background-color: #2a2a2a;
  border: 1px solid #3a3a3a;
}

html.dark .el-dialog__header {
  border-color: #3a3a3a;
}

html.dark .el-dialog__title {
  color: #e0e0e0;
}

html.dark .el-form-item__label {
  color: #b0b0b0;
}

html.dark .el-radio__label {
  color: #e0e0e0;
}

html.dark .el-descriptions__label {
  color: #b0b0b0;
}

html.dark .el-descriptions__content {
  color: #e0e0e0;
}

html.dark .el-alert {
  background-color: #333;
  border-color: #4a4a4a;
}

html.dark .el-alert__title {
  color: #e0e0e0;
}

html.dark .el-empty__description {
  color: #b0b0b0;
}

html.dark .el-upload {
  border-color: #4a4a4a;
}

html.dark .el-upload__tip {
  color: #b0b0b0;
}

html.dark .value-with-copy span,
html.dark .code {
  background-color: #333;
  color: #e0e0e0;
}

html.dark .notes-content {
  background-color: #333;
  color: #e0e0e0;
}

html.dark .preview-box {
  border-color: #4a4a4a;
}

html.dark .settings-card h4 {
  color: #e0e0e0;
}

html.dark .admin-dashboard .header {
  background-color: #2a2a2a;
  border-color: #3a3a3a;
}

html.dark .admin-dashboard {
  background-color: #1a1a1a;
}

html.dark .sidebar {
  background-color: #2a2a2a !important;
}

html.dark .el-container {
  background-color: #1a1a1a;
}

html.dark h2, html.dark h3, html.dark h4 {
  color: #e0e0e0;
}

html.dark .label {
  color: #b0b0b0;
}

html.dark .value {
  color: #e0e0e0;
}

html.dark .toolbar h3 {
  color: #e0e0e0;
}

html.dark .user-info {
  color: #e0e0e0;
}

html.dark .header-content {
  color: #e0e0e0;
}

html.dark .el-select-dropdown {
  background-color: #2a2a2a;
  border-color: #3a3a3a;
}

html.dark .el-select-dropdown__item {
  color: #e0e0e0;
}

html.dark .el-select-dropdown__item:hover {
  background-color: #333;
}

html.dark .el-popper {
  background-color: #2a2a2a;
  border-color: #3a3a3a;
}

html.dark .el-popconfirm__main {
  color: #e0e0e0;
}

html.dark .el-message-box {
  background-color: #2a2a2a;
  border-color: #3a3a3a;
}

html.dark .el-message-box__title {
  color: #e0e0e0;
}

html.dark .el-message-box__content {
  color: #e0e0e0;
}

html.dark .el-button--text {
  color: #409eff;
}

html.dark .el-tag {
  background-color: #333;
  border-color: #4a4a4a;
  color: #e0e0e0;
}

html.dark .el-tag.el-tag--success {
  background-color: #1f4d1f;
  border-color: #2d6b2d;
  color: #67c23a;
}

html.dark .el-tag.el-tag--info {
  background-color: #2d2d2d;
  border-color: #3d3d3d;
  color: #909399;
}

html.dark .el-progress__text {
  color: #e0e0e0;
}

html.dark .el-checkbox__label {
  color: #e0e0e0;
}

html.dark .el-checkbox__inner {
  background-color: #333;
  border-color: #4a4a4a;
}

html.dark .ql-toolbar {
  background-color: #333;
  border-color: #4a4a4a;
}

html.dark .ql-container {
  background-color: #2a2a2a;
  border-color: #4a4a4a;
}

html.dark .ql-editor {
  color: #e0e0e0;
}

html.dark .ql-snow .ql-stroke {
  stroke: #e0e0e0;
}

html.dark .ql-snow .ql-fill {
  fill: #e0e0e0;
}

html.dark .ql-snow .ql-picker-label {
  color: #e0e0e0;
}
</style>
