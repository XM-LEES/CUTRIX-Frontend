#!/bin/bash

echo "启动前端本地开发服务器..."
echo ""

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo "检测到 node_modules 不存在，正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "错误: 依赖安装失败"
        exit 1
    fi
    echo "依赖安装完成！"
    echo ""
fi

echo "启动 Vite 开发服务器（本地模式，端口 3001）..."
echo "前端地址: http://localhost:3001"
echo "后端代理: http://127.0.0.1:8080"
echo "注意: Docker 前端运行在 http://localhost:3000"
echo ""
VITE_PORT=3001 npm run dev

