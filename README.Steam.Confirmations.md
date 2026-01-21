# Steam确认功能使用指南

## 功能说明

Steam确认功能允许你在网页上查看和处理Steam交易确认，无需使用Steam官方应用。

## 为什么需要Session？

Steam确认API需要有效的登录会话（Session）才能工作。Session包含：
- **SessionID** - Steam会话ID
- **SteamLoginSecure** - 登录令牌
- **SteamID** - 64位Steam ID

这些数据在你登录Steam后由Steam服务器生成，通常有效期为几天到几周。

## 如何获取Session？

### 方法1：从浏览器获取（推荐）

1. **登录Steam**
   - 在Chrome/Edge/Firefox中访问 https://steamcommunity.com
   - 使用你的Steam账号登录

2. **打开开发者工具**
   - 按 `F12` 键
   - 或右键点击页面 → 选择"检查"

3. **找到Cookie**
   - 切换到 **Application** 标签（Chrome/Edge）或 **存储** 标签（Firefox）
   - 展开左侧 **Cookies** → **https://steamcommunity.com**

4. **复制Cookie值**
   
   **选项A：复制完整Cookie字符串（最简单）**
   - 在Cookie列表中，右键 → 全选
   - 复制所有Cookie
   - 格式类似：`sessionid=xxx; steamLoginSecure=xxx; ...`

   **选项B：单独复制（更精确）**
   - 找到 `sessionid`，复制它的值
   - 找到 `steamLoginSecure`，复制它的值

5. **在系统中更新Session**
   - 进入管理员面板 → Steam账户管理
   - 点击账户的"更新Session"按钮
   - 粘贴Cookie字符串或分别填入SessionID和SteamLoginSecure
   - 点击"更新会话"

### 方法2：从Steam Desktop Authenticator获取

如果你使用SDA（Steam Desktop Authenticator）：

1. 找到SDA的数据目录
2. 打开对应账户的 `.mafile` 文件
3. 查找 `Session` 字段
4. 复制其中的 `SessionID`、`SteamLoginSecure` 和 `SteamID`
5. 在系统中手动输入这些值

## 使用流程

### 1. 更新Session

```
管理员面板 → Steam账户 → 选择账户 → 更新Session → 粘贴Cookie → 保存
```

### 2. 查看确认

```
用户面板 → 选择账户 → 点击"查看确认"按钮
```

系统会显示所有待确认的交易，包括：
- 交易报价
- 市场出售
- 账户恢复
- 等等

### 3. 处理确认

- **接受单个确认**：点击"接受"按钮
- **拒绝单个确认**：点击"拒绝"按钮
- **批量接受**：勾选多个确认，点击"批量接受"

## 常见问题

### Q: Session会过期吗？

**A:** 会的。Steam的Session通常有效期为：
- 正常情况：7-30天
- 更换IP地址：可能立即失效
- 修改密码：立即失效

过期后需要重新获取并更新。

### Q: 如何知道Session是否有效？

**A:** 系统在更新Session时会自动验证。如果验证失败，会提示你重新获取。

你也可以尝试查看确认，如果返回"需要有效的Steam会话"错误，说明Session已失效。

### Q: 更新Session安全吗？

**A:** 
- ✅ 相对安全：Session只是临时凭证，不是密码
- ✅ 可控制：Session过期后自动失效
- ⚠️ 注意：不要在不信任的设备上获取Session
- ⚠️ 建议：定期更换Session

### Q: 为什么我的Session验证失败？

可能的原因：
1. **Cookie不完整** - 确保复制了完整的Cookie字符串
2. **Cookie已过期** - 重新登录Steam获取新的Cookie
3. **IP地址变化** - Steam检测到IP变化可能使Session失效
4. **账户被限制** - Steam账户被限制交易或登录

### Q: 可以自动刷新Session吗？

**A:** 目前不支持自动刷新。原因：
- Steam登录流程复杂（需要处理验证码、邮箱验证等）
- 自动登录可能被Steam检测为异常行为
- 存储密码存在安全风险

建议：手动定期更新Session（每周或每月一次）

## 技术细节

### Session数据结构

```json
{
  "SessionID": "xxxxxxxxxxxxxxxxxxxxxxxx",
  "SteamID": "76561198xxxxxxxxx",
  "SteamLoginSecure": "76561198xxxxxxxxx%7C%7Cxxxxxxxxxx",
  "OAuthToken": "xxxxxxxx",
  "UpdatedAt": "2026-01-21T12:00:00.000Z"
}
```

### API端点

- `POST /api/admin/steam-accounts/:id/session` - 更新Session
- `GET /api/user/accounts/:id/confirmations` - 获取确认列表
- `POST /api/user/accounts/:id/confirmations/accept` - 批量接受
- `POST /api/user/accounts/:id/confirmations/:confId/accept` - 接受单个
- `POST /api/user/accounts/:id/confirmations/:confId/deny` - 拒绝单个

### Session验证

系统会验证Session是否有效：
1. 使用Session访问Steam个人资料页面
2. 如果返回200状态码，说明Session有效
3. 如果返回302重定向到登录页，说明Session无效

## 安全建议

1. **定期更新** - 每1-2周更新一次Session
2. **及时撤销** - 如果怀疑Session泄露，立即修改Steam密码
3. **限制访问** - 只给信任的用户分配账户权限
4. **监控日志** - 定期检查登录日志，发现异常及时处理
5. **备份数据** - 定期备份数据库，防止数据丢失

## 故障排除

### 问题：点击"查看确认"后提示"需要有效的Steam会话"

**解决方案：**
1. 检查是否已更新Session
2. 重新获取Cookie并更新Session
3. 确认Steam账户没有被限制

### 问题：Session验证失败

**解决方案：**
1. 确保在同一浏览器中登录Steam并复制Cookie
2. 不要使用无痕模式的Cookie
3. 确保复制了完整的Cookie字符串
4. 尝试退出Steam重新登录

### 问题：确认列表为空

**可能原因：**
1. 确实没有待确认的交易
2. Session已过期
3. Steam API暂时不可用

**解决方案：**
1. 在Steam官方应用中确认是否有待确认项
2. 重新更新Session
3. 稍后再试

## 更新日志

### v1.0.0 (2026-01-21)
- ✅ 实现Session管理功能
- ✅ 支持从浏览器Cookie导入
- ✅ 支持手动输入Session数据
- ✅ 自动验证Session有效性
- ✅ 友好的错误提示
- ✅ 完整的使用文档

## 未来计划

- [ ] Session过期提醒
- [ ] 批量更新多个账户的Session
- [ ] Session有效期显示
- [ ] 自动检测Session状态
- [ ] 移动端支持

## 支持

如有问题，请查看：
- [主文档](README.md)
- [Docker部署指南](README.Docker.md)
- [GitHub Issues](https://github.com/your-repo/issues)
