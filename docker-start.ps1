# Docker 快速启动脚本 (PowerShell)

Write-Host "🚀 Steam取号器 - Docker 部署脚本" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Docker
Write-Host "🔍 检查 Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker 已安装: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 错误: 未安装 Docker Desktop" -ForegroundColor Red
    Write-Host "请先安装 Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# 检查 Docker 是否运行
Write-Host "🔍 检查 Docker 服务状态..." -ForegroundColor Yellow
$dockerRunning = $false
try {
    docker ps 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $dockerRunning = $true
        Write-Host "✅ Docker 服务正在运行" -ForegroundColor Green
    }
} catch {
    $dockerRunning = $false
}

if (-not $dockerRunning) {
    Write-Host "❌ 错误: Docker Desktop 未运行" -ForegroundColor Red
    Write-Host "请启动 Docker Desktop 并等待其完全启动后重试" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "正在尝试启动 Docker Desktop..." -ForegroundColor Yellow
    $dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerPath) {
        Start-Process $dockerPath -ErrorAction SilentlyContinue
    }
    Write-Host "等待 Docker Desktop 启动（30秒）..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
    
    # 再次检查
    $retries = 0
    $maxRetries = 10
    while ($retries -lt $maxRetries) {
        try {
            docker ps 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Docker 服务已启动" -ForegroundColor Green
                $dockerRunning = $true
                break
            }
        } catch {
            # 忽略错误，继续重试
        }
        $retries++
        if ($retries -ge $maxRetries) {
            Write-Host "❌ Docker 启动超时，请手动启动 Docker Desktop 后重试" -ForegroundColor Red
            exit 1
        }
        Start-Sleep -Seconds 3
    }
}

# 检查环境变量文件
Write-Host ""
Write-Host "🔍 检查环境变量配置..." -ForegroundColor Yellow
if (-Not (Test-Path "backend\.env")) {
    Write-Host "⚠️  警告: backend\.env 文件不存在" -ForegroundColor Yellow
    if (Test-Path "backend\.env.example") {
        Copy-Item "backend\.env.example" "backend\.env"
        Write-Host "✅ 已从 .env.example 创建 .env 文件" -ForegroundColor Green
        Write-Host "⚠️  请编辑 backend\.env 文件，设置 JWT_SECRET！" -ForegroundColor Yellow
    } else {
        Write-Host "❌ 错误: backend\.env.example 文件不存在" -ForegroundColor Red
        Write-Host "请手动创建 backend\.env 文件，至少包含：" -ForegroundColor Yellow
        Write-Host "  JWT_SECRET=your-super-secret-jwt-key-change-in-production" -ForegroundColor Yellow
        exit 1
    }
}

# 检查 JWT_SECRET
$envContent = Get-Content "backend\.env" -Raw
if ($envContent -match "your-super-secret-jwt-key-change-in-production" -or $envContent -match "your-secret-key-change-this") {
    Write-Host "⚠️  警告: JWT_SECRET 仍为默认值，请修改 backend\.env 文件！" -ForegroundColor Yellow
}

# 创建必要的目录
Write-Host ""
Write-Host "📁 创建必要的目录..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "backend\data\uploads" | Out-Null
New-Item -ItemType Directory -Force -Path "nginx\ssl" | Out-Null
Write-Host "✅ 目录创建完成" -ForegroundColor Green

# 构建并启动服务
Write-Host ""
Write-Host "📦 构建 Docker 镜像..." -ForegroundColor Yellow
docker compose build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 构建失败" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🚀 启动服务..." -ForegroundColor Yellow
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 启动失败" -ForegroundColor Red
    exit 1
}

# 等待服务启动
Write-Host ""
Write-Host "⏳ 等待服务启动（10秒）..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 检查服务状态
Write-Host ""
Write-Host "📊 服务状态:" -ForegroundColor Yellow
docker compose ps

# 显示日志（可选）
Write-Host ""
Write-Host "📋 查看日志（按 Ctrl+C 退出）:" -ForegroundColor Yellow
Write-Host "   docker compose logs -f" -ForegroundColor Gray
Write-Host ""

# 显示访问信息
Write-Host "================================" -ForegroundColor Cyan
Write-Host "✅ 部署完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📱 访问地址:" -ForegroundColor Cyan
Write-Host "   前端: http://localhost:8081" -ForegroundColor White
Write-Host "   后端 API: http://localhost:3010/api" -ForegroundColor White
Write-Host "   健康检查: http://localhost:3010/api/health" -ForegroundColor White
Write-Host ""
Write-Host "👤 默认账户:" -ForegroundColor Cyan
Write-Host "   管理员: admin / admin123" -ForegroundColor White
Write-Host "   测试用户: user / user123" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  生产环境请立即修改默认密码！" -ForegroundColor Yellow
Write-Host ""
Write-Host "📋 常用命令:" -ForegroundColor Cyan
Write-Host "   查看日志: docker compose logs -f" -ForegroundColor Gray
Write-Host "   停止服务: docker compose stop" -ForegroundColor Gray
Write-Host "   重启服务: docker compose restart" -ForegroundColor Gray
Write-Host "   删除服务: docker compose down" -ForegroundColor Gray
Write-Host "   查看状态: docker compose ps" -ForegroundColor Gray
Write-Host "================================" -ForegroundColor Cyan
