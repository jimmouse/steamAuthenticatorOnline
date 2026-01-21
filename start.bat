@echo off
chcp 65001 >nul
echo ======================================
echo Steam Authenticator Online - 启动脚本
echo ======================================

REM 检查Docker是否安装
docker --version >nul 2>&1
if errorlevel 1 (
    echo 错误: Docker 未安装
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo 错误: Docker Compose 未安装
    pause
    exit /b 1
)

REM 检查.env文件
if not exist "backend\.env" (
    echo 警告: backend\.env 文件不存在，创建默认配置...
    (
        echo JWT_SECRET=change-this-to-a-secure-random-string
        echo PORT=3010
        echo NODE_ENV=production
        echo TRUST_PROXY=false
    ) > backend\.env
    echo 已创建 backend\.env 文件
)

REM 创建必要的目录
if not exist "backend\data" mkdir backend\data
if not exist "backend\uploads" mkdir backend\uploads

REM 构建并启动
echo.
echo 正在构建Docker镜像...
docker-compose build

echo.
echo 正在启动服务...
docker-compose up -d

echo.
echo 等待服务启动...
timeout /t 5 /nobreak >nul

REM 检查服务状态
echo.
echo 服务状态:
docker-compose ps

echo.
echo ======================================
echo 启动完成！
echo 前端地址: http://localhost
echo 后端API: http://localhost:3010
echo.
echo 查看日志: docker-compose logs -f
echo 停止服务: docker-compose down
echo ======================================
pause
