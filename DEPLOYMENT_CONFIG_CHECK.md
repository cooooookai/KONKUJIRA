# Band Sync Calendar - 部署配置检查指南

## 🔍 配置检查清单

### 1. 前端配置检查 ✅

**文件**: `src/frontend/js/config.js`

当前配置：
```javascript
API_BASE_URL: 'https://band-sync-calendar.coooookai.workers.dev'
```

**状态**: ✅ 正确 - 已设置为实际的Worker地址

### 2. 后端CORS配置检查 ⚠️

**文件**: `wrangler.toml`

当前配置：
```toml
[env.production.vars]
ALLOWED_ORIGINS = "https://cooooookai.github.io"
```

**需要确认的GitHub Pages URL格式**：

根据你的GitHub用户名 `cooooookai`，可能的URL格式有：

1. **用户页面** (推荐): `https://cooooookai.github.io`
2. **项目页面**: `https://cooooookai.github.io/REPOSITORY_NAME`

### 3. 配置修正建议

#### 选项A: 如果使用用户页面 (推荐)
```toml
[env.production.vars]
ALLOWED_ORIGINS = "https://cooooookai.github.io"
```

#### 选项B: 如果使用项目页面
```toml
[env.production.vars]
ALLOWED_ORIGINS = "https://cooooookai.github.io/band-sync-calendar"
```

#### 选项C: 支持多个域名 (最安全)
```toml
[env.production.vars]
ALLOWED_ORIGINS = "https://cooooookai.github.io,https://cooooookai.github.io/band-sync-calendar"
```

## 🚀 部署步骤

### 步骤1: 确认GitHub Pages设置

1. 进入GitHub仓库设置
2. 找到 "Pages" 部分
3. 确认部署源和分支
4. 记录实际的访问URL

### 步骤2: 更新CORS配置

根据实际的GitHub Pages URL更新 `wrangler.toml`：

```toml
[env.production.vars]
ALLOWED_ORIGINS = "你的实际GitHub Pages URL"
ENVIRONMENT = "production"
```

### 步骤3: 部署后端

```bash
# 部署到生产环境
wrangler deploy --env production

# 验证部署
wrangler tail --env production
```

### 步骤4: 测试API连接

使用测试脚本验证API：

```bash
# 更新测试脚本中的URL
node src/backend/test-api.js
```

## 🧪 测试验证

### 1. 本地测试
```bash
# 在 band-sync-calendar 目录下
python -m http.server 8000
# 访问 http://localhost:8000/src/frontend/
```

### 2. 生产测试
1. 访问你的GitHub Pages URL
2. 打开浏览器开发者工具
3. 检查网络请求是否成功
4. 查看控制台是否有CORS错误

## 🔧 常见问题解决

### CORS错误
```
Access to fetch at 'https://band-sync-calendar.coooookai.workers.dev/events' 
from origin 'https://cooooookai.github.io' has been blocked by CORS policy
```

**解决方案**:
1. 确认 `ALLOWED_ORIGINS` 包含正确的GitHub Pages URL
2. 重新部署Worker: `wrangler deploy --env production`
3. 清除浏览器缓存

### API连接失败
```
TypeError: Failed to fetch
```

**检查项目**:
1. Worker是否成功部署
2. 数据库是否正确绑定
3. API URL是否正确

### 数据库连接错误
```
Error: D1_ERROR: no such table: events
```

**解决方案**:
```bash
# 重新创建数据库表
wrangler d1 execute band-sync-calendar-db --file=./src/backend/schema.sql --env production
```

## 📋 部署检查清单

- [ ] GitHub Pages已启用并可访问
- [ ] 记录了正确的GitHub Pages URL
- [ ] 更新了 `wrangler.toml` 中的 `ALLOWED_ORIGINS`
- [ ] Worker已部署到生产环境
- [ ] 数据库表已创建
- [ ] API测试通过
- [ ] 前端可以成功调用后端API
- [ ] 所有功能正常工作

## 🎯 快速修复命令

如果需要快速修复CORS问题：

```bash
# 1. 更新CORS设置为支持多个域名
# 编辑 wrangler.toml，设置：
# ALLOWED_ORIGINS = "https://cooooookai.github.io,https://cooooookai.github.io/band-sync-calendar"

# 2. 重新部署
wrangler deploy --env production

# 3. 测试API
curl -H "Origin: https://cooooookai.github.io" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://band-sync-calendar.coooookai.workers.dev/events
```

---

**下一步**: 确认你的GitHub Pages实际URL，然后相应更新CORS配置！