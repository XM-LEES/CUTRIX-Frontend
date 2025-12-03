# CUTRIX Frontend

CUTRIX 裁剪车间管理系统前端应用

## 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI 组件库**: Ant Design 5
- **状态管理**: Zustand
- **路由**: React Router v6
- **HTTP 客户端**: Axios
- **日期处理**: dayjs

## 项目结构

```
src/
├── api/              # API 客户端封装（按模块拆分）
├── store/            # 状态管理（Zustand）
├── components/       # 通用组件
│   ├── layout/       # 布局组件
│   ├── forms/        # 表单组件
│   └── tables/       # 表格组件
├── pages/            # 页面组件
├── hooks/            # 自定义 Hooks
├── utils/            # 工具函数
│   ├── permissions.ts
│   └── format.ts
└── types/            # TypeScript 类型定义
```

## 开发

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

### Docker 开发（推荐）

在项目根目录使用统一脚本：

```powershell
# Windows
.\start.ps1 dev -Detached

# Linux/Mac
make dev-up
```

详细说明请查看项目根目录的 `README.md`

## 核心特性

- ✅ JWT Token 认证与自动刷新
- ✅ RBAC 权限控制（路由守卫 + 组件级权限）
- ✅ 统一的 API 错误处理
- ✅ 响应式布局设计
- ✅ TypeScript 类型安全

