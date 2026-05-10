# 数星 ✨ - 情感陪伴 AI

数星是一个情感陪伴与关系分析工具，让用户能与模拟的重要他人对话，或获得关系分析。

## 🚀 快速启动

### 1. 配置 API Key（通过环境变量）

```bash
# DeepSeek（已有默认 key，可不配置）
export DEEPSEEK_API_KEY="sk-xxx"

# 通义千问（阿里云百炼）
export QWEN_API_KEY="sk-xxx"

# Moonshot/Kimi
export MOONSHOT_API_KEY="sk-xxx"
```

> **API Key 不会 hardcode 在代码里**。所有 Key 通过环境变量读取，proxy-server.js 中只有 DeepSeek 有一个内置默认值。

### 2. 启动服务器

```bash
cd 数星-网页原型
node proxy-server.js
```

启动后访问 http://localhost:3000/

### 3. 检查状态

```bash
curl http://localhost:3000/api/health
```

返回 JSON，包含各模型启用状态和连接情况。

### 4. 测试聊天

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-Model-Provider: deepseek" \
  -H "X-Task-Tier: simple" \
  -d '{"messages":[{"role":"user","content":"你好"}],"stream":false}'
```

## 🧠 模型架构

### 后端 (proxy-server.js)

- **DeepSeek** — `api.deepseek.com` / `deepseek-chat`（默认，内置 key）
- **Qwen (通义千问)** — `dashscope.aliyuncs.com` / `qwen-turbo`（需 `QWEN_API_KEY` 环境变量）
- **Moonshot/Kimi** — `api.moonshot.cn` / `moonshot-v1-8k`（需 `MOONSHOT_API_KEY` 环境变量）

所有模型适配器使用 OpenAI 兼容格式，通过统一接口调用。

### 模型调度

请求头控制使用哪个模型：

| 请求头 | 值 | 说明 |
|--------|-----|------|
| `X-Model-Provider` | `deepseek` / `qwen` / `moonshot` | 指定模型 |
| `X-Task-Tier` | `simple` / `medium` / `deep` | 任务分级 |

自动降级机制：指到的模型挂了会自动切到下一个可用的。

### 前端 (chat.js)

- **强制使用 API 模型**：移除了 GitHub Pages 检测导致的自动降级
- **System Prompt 策略**：包含数星的渐进式对话引导（L1 收集信息 → L2 建立记忆 → L3 深化连接 → L4 稳固陪伴）
- **昵称 Bug 修复**：`{n}` 占位符在星伴模式下替换为"你"，星析模式下替换为对方昵称/TA
- **本地降级兜底**：API 不可用时自动使用本地话术库

## 🎯 改造记录 (V5)

### 修复的问题
1. ✅ **接入真实大模型**：所有对话回复走大模型生成，不再使用本地预设话术
2. ✅ **话术库增强**：API 不可时时仍有本地兜底
3. ✅ **昵称 Bug**：修复 `{n}` 在星伴模式下错误替换为对方昵称的问题
4. ✅ **对话策略**：System Prompt 包含渐进式引导（L1→L2→L3→L4）

### 主要改动
- `proxy-server.js` — V5 重写：全 OpenAI 兼容适配器 + 环境变量 API Key
- `js/chat.js` — V5 重写：强制 API 模式 + 修复昵称 + 对话策略 system prompt
- `js/model-scheduler.js` — 移除前端硬编码的 API Key

## 📁 项目结构

```
数星-网页原型/
├── proxy-server.js      # 后端 API 代理服务器（V5）
├── js/
│   ├── chat.js          # 对话页面脚本（V5）
│   ├── main.js          # 首页脚本
│   ├── profile.js       # 个人设置
│   ├── setup.js         # 人格设置
│   ├── personality-data.js  # 星座/MBTI 数据
│   ├── character-model.js   # 人物模型管理
│   ├── model-scheduler.js   # 前端模型调度器
│   ├── analysis-engine.js   # 分析引擎
│   ├── safety.js        # 安全检测
│   └── star-effects.js  # 星光特效
├── css/
│   ├── style.css        # 主样式
│   └── components.css   # 组件样式
├── index.html           # 首页
├── chat.html            # 对话页
├── setup.html           # 设置页
└── package.json         # 项目配置
```

## ⚡ 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```
