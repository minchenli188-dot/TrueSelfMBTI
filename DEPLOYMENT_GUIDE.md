# TrueSelf16 - 部署与维护指南

> **生产环境**: https://trueself16.com  
> **GitHub**: https://github.com/minchenli188-dot/TrueSelfMBTI

---

## 📋 目录

1. [项目概述](#1-项目概述)
2. [服务器信息](#2-服务器信息)
3. [技术栈](#3-技术栈)
4. [项目结构](#4-项目结构)
5. [本地开发](#5-本地开发)
6. [部署更新流程](#6-部署更新流程)
7. [服务器管理命令](#7-服务器管理命令)
8. [环境变量配置](#8-环境变量配置)
9. [API 接口概览](#9-api-接口概览)
10. [故障排查](#10-故障排查)

---

## 1. 项目概述

TrueSelf16 是一款 AI 驱动的 MBTI 性格测评应用，通过自然对话（而非传统选择题）来深入理解用户性格。

### 核心功能

| 功能 | 描述 |
|------|------|
| 🗣️ 自然对话 | 像和朋友聊天一样进行性格探索 |
| 📊 三级深度 | 快速(5题)、标准(15题)、深度(30题) |
| 🎨 专属画像 | AI 生成 Pop Mart 风格人格肖像 |
| 💬 AI 解答 | 测试后与 AI 对话解答疑问 |
| 📈 渐进升级 | 从快速模式无缝升级到更深层分析 |

### 支持的 MBTI 类型

- 🟣 **分析家 (NT)**: INTJ, INTP, ENTJ, ENTP
- 🟢 **外交家 (NF)**: INFJ, INFP, ENFJ, ENFP
- 🔵 **守卫者 (SJ)**: ISTJ, ISFJ, ESTJ, ESFJ
- 🟡 **探索者 (SP)**: ISTP, ISFP, ESTP, ESFP

---

## 2. 服务器信息

### AWS Lightsail 配置

| 项目 | 值 |
|------|-----|
| **实例名称** | TrueSelf16 |
| **区域** | ap-southeast-1 (新加坡) |
| **静态 IP** | 18.139.165.168 |
| **操作系统** | Ubuntu 24.04 LTS |
| **用户名** | ubuntu |

### 域名配置

| 项目 | 值 |
|------|-----|
| **域名** | trueself16.com |
| **DNS 提供商** | Cloudflare |
| **SSL 模式** | Flexible (Cloudflare 处理 HTTPS) |

### 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| Nginx | 80 | 对外网关，反向代理 |
| Next.js | 3000 | 前端应用 (内部) |
| FastAPI | 8000 | 后端 API (内部) |

---

## 3. 技术栈

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| FastAPI | 0.115.6 | Web 框架 |
| Python | 3.11+ | 编程语言 |
| SQLAlchemy | 2.0.36 | 异步 ORM |
| SQLite | - | 数据库 |
| Google Gemini | - | AI 服务 |
| Uvicorn | 0.34.0 | ASGI 服务器 |

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 15.1.3 | React 框架 |
| React | 19.0.0 | UI 库 |
| TypeScript | 5.7.2 | 类型安全 |
| Tailwind CSS | 3.4.17 | 样式 |
| Framer Motion | 11.15.0 | 动画 |
| Zustand | 5.0.2 | 状态管理 |

### AI 模型

| 模型 | 用途 |
|------|------|
| gemini-3-flash-preview | 对话问答 (快速) |
| gemini-3-pro-preview | 最终分析报告 (深度) |
| gemini-3-pro-image-preview | 头像生成 |

---

## 4. 项目结构

```
TrueSelf16/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 入口
│   │   ├── config.py            # 配置管理
│   │   ├── dependencies.py      # 依赖注入
│   │   ├── models/
│   │   │   ├── database.py      # 数据库模型
│   │   │   ├── schemas.py       # Pydantic 模式
│   │   │   ├── analytics.py     # 分析数据模型
│   │   │   └── analytics_schemas.py
│   │   ├── routers/
│   │   │   ├── chat.py          # 聊天 API
│   │   │   └── analytics.py     # 分析 API
│   │   └── services/
│   │       ├── ai_service.py    # AI 服务
│   │       ├── image_generator.py
│   │       └── user_insight_extractor.py
│   ├── requirements.txt
│   ├── .env                     # 环境变量 (不提交)
│   └── venv/                    # Python 虚拟环境
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx       # 根布局
│   │   │   ├── page.tsx         # 主页面
│   │   │   ├── providers.tsx    # Context Providers
│   │   │   └── globals.css      # 全局样式
│   │   ├── components/
│   │   │   ├── chat/            # 聊天组件
│   │   │   ├── ResultView.tsx   # 结果页
│   │   │   ├── AIQAView.tsx     # AI 问答
│   │   │   └── DepthSelector.tsx
│   │   ├── hooks/
│   │   │   ├── useChatSession.ts  # 核心聊天逻辑
│   │   │   ├── useQASession.ts
│   │   │   └── useAnalytics.ts
│   │   ├── lib/
│   │   │   ├── api.ts           # API 客户端
│   │   │   └── utils.ts
│   │   ├── context/
│   │   │   ├── ThemeContext.tsx
│   │   │   └── ToastContext.tsx
│   │   └── types/
│   │       └── mbti.ts
│   ├── package.json
│   ├── .env.local               # 环境变量 (不提交)
│   └── node_modules/
│
├── ecosystem.config.js          # PM2 配置
├── .gitignore
├── README.md
└── DEPLOYMENT_GUIDE.md          # 本文档
```

---

## 5. 本地开发

### 环境要求

- Python 3.11+
- Node.js 20+
- pnpm (推荐)

### 启动后端

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 创建 .env 文件
echo "GEMINI_API_KEY=your_api_key" > .env

# 启动
uvicorn app.main:app --reload --port 8000
```

### 启动前端

```bash
cd frontend
pnpm install

# 创建 .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# 启动
pnpm dev
```

### 本地访问

- 前端: http://localhost:3000
- 后端 API: http://localhost:8000
- API 文档: http://localhost:8000/docs

---

## 6. 部署更新流程

### 标准更新流程

#### 第一步：本地提交代码

```bash
cd "/Users/minchenli/Cursor Project/MBTI"
git add .
git commit -m "描述你的更改"
git push
```

#### 第二步：服务器拉取并部署

```bash
# SSH 连接服务器后
cd ~/TrueSelfMBTI
git pull
```

#### 第三步：根据改动类型执行对应命令

| 改动类型 | 命令 |
|---------|------|
| **只改前端代码** | `cd frontend && pnpm build && pm2 restart mbti-frontend` |
| **只改后端代码** | `pm2 restart mbti-backend` |
| **改了前端依赖** | `cd frontend && pnpm install && pnpm build && pm2 restart mbti-frontend` |
| **改了后端依赖** | `cd backend && source venv/bin/activate && pip install -r requirements.txt && pm2 restart mbti-backend` |
| **改了 Nginx** | `sudo nginx -t && sudo systemctl restart nginx` |

### 一键更新脚本

服务器上已创建快捷脚本 `~/update.sh`:

```bash
~/update.sh
```

---

## 7. 服务器管理命令

### SSH 连接

```bash
# 通过 Lightsail 控制台的 "Connect using SSH" 按钮
# 或使用本地终端：
ssh -i <你的密钥文件> ubuntu@18.139.165.168
```

### PM2 进程管理

```bash
# 查看所有服务状态
pm2 status

# 查看日志
pm2 logs                    # 所有日志
pm2 logs mbti-frontend      # 只看前端
pm2 logs mbti-backend       # 只看后端
pm2 logs --lines 100        # 最近 100 行

# 重启服务
pm2 restart all             # 重启所有
pm2 restart mbti-frontend   # 只重启前端
pm2 restart mbti-backend    # 只重启后端

# 停止/启动
pm2 stop all
pm2 start all

# 监控资源使用
pm2 monit
```

### Nginx 管理

```bash
# 测试配置
sudo nginx -t

# 重启
sudo systemctl restart nginx

# 查看状态
sudo systemctl status nginx

# 查看错误日志
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### 系统管理

```bash
# 查看磁盘使用
df -h

# 查看内存使用
free -h

# 查看系统负载
htop

# 重启服务器 (谨慎使用)
sudo reboot
```

---

## 8. 环境变量配置

### 后端 (`backend/.env`)

```env
# 生产环境
DEBUG=false

# AI 服务 (必填)
GEMINI_API_KEY=your_gemini_api_key_here

# 数据库 (默认 SQLite)
DATABASE_URL=sqlite+aiosqlite:///./mbti_assistant.db
```

### 前端 (`frontend/.env.local`)

```env
# 生产环境 API 地址
NEXT_PUBLIC_API_URL=https://trueself16.com
```

### 重要提醒

⚠️ `.env` 和 `.env.local` 文件包含敏感信息，**不要提交到 Git**！  
已在 `.gitignore` 中配置忽略。

---

## 9. API 接口概览

### 聊天 API (`/api/chat`)

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/start` | 开始新会话 |
| POST | `/message` | 发送消息 |
| POST | `/finish` | 完成测试，获取结果 |
| POST | `/upgrade` | 升级到更深层次 |
| POST | `/qa` | AI 问答 |
| POST | `/image` | 生成头像 |
| GET | `/history/{session_id}` | 获取聊天历史 |
| GET | `/status/{session_id}` | 获取会话状态 |

### 分析 API (`/api/analytics`)

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/profile` | 创建用户档案 |
| POST | `/event` | 记录事件 |
| POST | `/feedback` | 提交反馈 |
| GET | `/stats` | 获取统计数据 |

### 健康检查

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/` | API 信息 |
| GET | `/health` | 健康状态 |
| GET | `/docs` | Swagger 文档 |

---

## 10. 故障排查

### 网站无法访问

1. **检查服务状态**
   ```bash
   pm2 status
   sudo systemctl status nginx
   ```

2. **检查日志**
   ```bash
   pm2 logs --lines 50
   sudo tail -f /var/log/nginx/error.log
   ```

3. **重启所有服务**
   ```bash
   pm2 restart all
   sudo systemctl restart nginx
   ```

### API 返回错误

1. **检查后端日志**
   ```bash
   pm2 logs mbti-backend --lines 100
   ```

2. **检查 Gemini API Key**
   ```bash
   cat ~/TrueSelfMBTI/backend/.env
   ```

3. **测试 API 是否正常**
   ```bash
   curl http://127.0.0.1:8000/health
   ```

### 前端页面空白

1. **检查前端是否构建成功**
   ```bash
   cd ~/TrueSelfMBTI/frontend
   pnpm build
   ```

2. **检查环境变量**
   ```bash
   cat ~/TrueSelfMBTI/frontend/.env.local
   ```

3. **重启前端**
   ```bash
   pm2 restart mbti-frontend
   ```

### 内存不足 (构建失败)

1. **检查 Swap 是否启用**
   ```bash
   free -h
   ```

2. **如果 Swap 为 0，重新配置**
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

### SSL 证书问题

域名使用 Cloudflare Flexible SSL，证书由 Cloudflare 管理，无需手动更新。

如遇 HTTPS 问题：
1. 登录 Cloudflare Dashboard
2. 检查 SSL/TLS 设置是否为 "Flexible"
3. 检查 DNS 记录是否正确

---

## 📞 快速参考

### 常用命令速查

```bash
# 查看服务状态
pm2 status

# 更新代码并重启
cd ~/TrueSelfMBTI && git pull && cd frontend && pnpm build && pm2 restart all

# 查看最近日志
pm2 logs --lines 50

# 测试 API
curl https://trueself16.com/health
```

### 重要文件位置

| 文件 | 路径 |
|------|------|
| 项目代码 | `~/TrueSelfMBTI/` |
| PM2 配置 | `~/TrueSelfMBTI/ecosystem.config.js` |
| Nginx 配置 | `/etc/nginx/sites-available/mbti` |
| 后端环境变量 | `~/TrueSelfMBTI/backend/.env` |
| 前端环境变量 | `~/TrueSelfMBTI/frontend/.env.local` |
| SQLite 数据库 | `~/TrueSelfMBTI/backend/mbti_assistant.db` |

---

**最后更新**: 2026年1月4日  
**维护者**: Minchen Li


