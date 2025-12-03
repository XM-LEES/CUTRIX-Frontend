# 开发环境 Dockerfile
# 使用 Node.js 官方镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖（使用缓存优化）
# 如果本地已有 node_modules，可以注释掉这行，使用本地安装的依赖
RUN npm install --prefer-offline --no-audit

# 复制源代码
COPY . .

# 暴露 Vite 开发服务器端口
EXPOSE 3000

# 启动开发服务器
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

