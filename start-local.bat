@echo off
chcp 65001 >nul
echo 启动前端本地开发服务器...
echo.

REM 检查 node_modules 是否存在
if not exist "node_modules" (
    echo 检测到 node_modules 不存在，正在安装依赖...
    call npm install
    if errorlevel 1 (
        echo 错误: 依赖安装失败
        exit /b 1
    )
    echo 依赖安装完成！
    echo.
)

echo 启动 Vite 开发服务器（本地模式，端口 3001）...
echo 前端地址: http://localhost:3001
echo 后端代理: http://127.0.0.1:8080
echo 注意: Docker 前端运行在 http://localhost:3000
echo.
set VITE_PORT=3001
call npm run dev

