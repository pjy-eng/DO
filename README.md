# 🌌 AI 智能时间管理与情绪陪伴 · ai-time-companion-mvp

> 这不是普通效率工具，而是一个「有温度的外置大脑」。  
> 用户完成的不是任务，而是把一周的努力变成一片属于自己的星云。

---

## 一、项目简介

**ai-time-companion-mvp** 融合了：
- 每日情绪 Check-in（睡眠 / 疲劳 / 情绪状态）
- AI 智能日程排期（基于状态与任务生成温和排期）
- 今日看板（待办、时间轴、完成动效）
- Brain Dump 大脑放空（随手记录碎片想法）
- 星云复盘 Nebula Review（沉浸式 Canvas 星云 + AI 周报）
- 防破窗机制（昨日未完成任务温和处理）

---

## 二、功能说明

| 模块 | 说明 |
|------|------|
| Check-in 弹窗 | 每日首次打开自动弹出，采集睡眠/疲劳/情绪 |
| AI 排期 | 后端调用大模型生成今日时间轴 |
| 今日看板 | 左侧待办 + 右侧时间轴 + AI 留言 |
| Brain Dump | 底部固定输入框，随手记录 |
| 星云复盘 | 全屏 Canvas 星云 + 玻璃拟态复盘卡片 + AI 周报 |
| 星星飞行 | 任务完成后星星从卡片飞向星云入口 |

---

## 三、项目结构

```
ai-time-companion-mvp/
├── README.md
├── .gitignore
├── frontend/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js
│   ├── .env.example
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       └── components/
│           ├── CheckInModal.jsx     # 每日状态弹窗
│           ├── DayBoard.jsx         # 今日看板
│           ├── BrainDumpBar.jsx     # 大脑放空输入
│           ├── NebulaReview.jsx     # 星云复盘视图
│           ├── NebulaCanvas.jsx     # Canvas 粒子星云
│           └── FloatingStars.jsx   # 星星飞行动效
└── backend/
    ├── main.py
    ├── requirements.txt
    └── .env.example
```

---

## 四、本地启动后端

```bash
cd backend

# 创建虚拟环境
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的 OPENAI_API_KEY

# 启动
uvicorn main:app --reload --port 8000
```

---

## 五、本地启动前端

```bash
cd frontend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 默认 VITE_API_BASE_URL=http://localhost:8000

# 启动
npm run dev
```

访问 http://localhost:5173

---

## 六、环境变量说明

### 前端 `frontend/.env`

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_API_BASE_URL` | 后端 API 地址 | `http://localhost:8000` |

### 后端 `backend/.env`

| 变量 | 说明 |
|------|------|
| `OPENAI_API_KEY` | OpenAI API Key（必填） |
| `OPENAI_BASE_URL` | 自定义 API Base URL（可选，兼容其他 LLM） |
| `OPENAI_MODEL` | 使用的模型（默认 `gpt-4o`） |
| `FRONTEND_ORIGINS` | 前端地址，CORS 用；支持逗号分隔多个域名（默认 `http://localhost:5173`） |

---

## 七、今日排期 API

**POST /api/schedule**

请求体：
```json
{
  "checkin": {
    "sleep_time": "23:00",
    "energy_level": 6,
    "mood": "平静"
  },
  "yesterday_unfinished_tasks": [],
  "yesterday_unfinished_action": "none",
  "today_todos": [
    { "id": "t1", "title": "完成前端结构" }
  ],
  "brain_dump_items": ["想起来要回邮件"]
}
```

响应：
```json
{
  "ai_message": "今天的能量还不错，我们稳稳地推进吧。",
  "timeline": [
    {
      "time": "09:00 - 10:30",
      "title": "深度工作：完成前端结构",
      "type": "focus",
      "reason": "上午精力充沛，适合高耗能任务"
    }
  ],
  "deferred_tasks": [],
  "cancelled_tasks": [],
  "brain_dump_next_actions": []
}
```

---

## 八、周末星云复盘 API

**POST /api/weekly-review**

请求体：
```json
{
  "completed_tasks": [],
  "daily_checkins": [],
  "brain_dump_items": [],
  "schedules": []
}
```

响应：
```json
{
  "summary_message": "这一周，你在不同的疲惫状态下仍然保持了推进。",
  "effort_highlights": ["你完成了 12 项任务"],
  "pattern_insights": ["上午更适合深度工作"],
  "next_week_suggestions": ["下周可以把大任务拆成两个 40 分钟块"],
  "gentle_closing": "微光不是用来比较的，它只是记录你没有放弃。"
}
```

---

## 九、Vercel 部署前端

1. Fork 仓库到 GitHub
2. 在 Vercel 新建项目，选择 `frontend/` 目录
3. 设置环境变量 `VITE_API_BASE_URL` 为你的后端地址
4. 构建命令：`npm run build`，输出目录：`dist`

---

## 十、Render 部署后端

1. 在 Render 新建 Web Service
2. 选择 `backend/` 目录
3. 构建命令：`pip install -r requirements.txt`
4. 启动命令：`uvicorn main:app --host 0.0.0.0 --port $PORT`
5. 设置环境变量：`OPENAI_API_KEY`、`FRONTEND_ORIGINS`

---

## 十一、动效设计说明

| 动效 | 实现方式 |
|------|---------|
| Check-in 弹窗进入 | Framer Motion `initial/animate`，卡片上浮 + 淡入 |
| 选项按钮悬停 | scale + border glow |
| 任务完成星星飞行 | Framer Motion `animate`，弧线飞向星云入口 |
| Brain Dump 微光 | CSS keyframes 扩散动画 |
| Nebula Review 背景 | Canvas + requestAnimationFrame 粒子星云 |
| 复盘卡片淡入 | Framer Motion stagger，延迟分段入场 |
| 数字 count-up | requestAnimationFrame 数字递增 |
| 鼠标视差 | Canvas parallax offset 跟随鼠标 |

支持 `prefers-reduced-motion`，系统开启减少动画时自动降低强度。

---

## 十二、下一阶段开发建议

1. **数据持久化**：接 Supabase / PostgreSQL，替换 localStorage
2. **用户登录**：Supabase Auth，支持邮箱 / Google 登录
3. **任务持久化**：tasks / checkins / brain_dump / schedules 存库
4. **午夜整理**：定时任务 + Cron，自动将 Brain Dump 整理进明日计划
5. **真实周末复盘**：从数据库读取真实周数据替代 localStorage
6. **微信小程序迁移**：
   - React 组件逻辑迁移至 Taro / uni-app
   - Canvas 星云动画使用小程序 `wx.createCanvasContext` 适配
   - localStorage 替换为 `wx.setStorageSync`
   - Framer Motion 替换为 `wx.createAnimation` 或 CSS 动画
7. **推送提醒**：小程序订阅消息，定时推送每日 Check-in 提醒
