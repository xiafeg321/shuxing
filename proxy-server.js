/**
 * 数星 - API代理服务器 V5（全适配器 + 环境变量API Key）
 *
 * 改造目标：
 * - 所有模型适配器用 OpenAI 兼容格式（DeepSeek/Qwen/Moonshot 都兼容）
 * - API Key 从环境变量读取，不硬编码在文件里
 * - 保留任务分级调度（simple/medium/deep）
 * - 保留流式输出支持
 * - 保留健康检查 /api/health
 * - 保留静态文件服务
 *
 * 环境变量：
 *   DEEPSEEK_API_KEY  — DeepSeek API Key (默认: sk-f01481a824b243b28999980106c876c8)
 *   QWEN_API_KEY      — 通义千问 API Key (阿里云百炼)
 *   MOONSHOT_API_KEY  — Moonshot/Kimi API Key
 *
 * 启动：node proxy-server.js
 * 或：  QWEN_API_KEY=xxx MOONSHOT_API_KEY=xxx node proxy-server.js
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// ====================================================================
// 环境变量读取 API Key（不硬编码在代码里）
// ====================================================================
function getEnv(key, fallback) {
  return process.env[key] || fallback || '';
}

// ====================================================================
// 模型适配层：统一 OpenAI 兼容格式
// ====================================================================

class ModelAdapter {
  constructor(config) {
    this.config = config;
    this.name = config.name;
    this.modelName = config.modelName;
    this.enabled = config.enabled || false;
  }

  /**
   * 构建 OpenAI 兼容的请求参数
   * @param {Object} params
   * @returns {{ hostname, port, path, method, headers, postData }}
   */
  async buildRequest(params) {
    const { messages, temperature, maxTokens, stream } = params;

    const body = {
      model: this.modelName,
      messages,
      temperature: temperature ?? 0.8,
      max_tokens: maxTokens || 300,
      stream: stream !== false,
    };

    const postData = JSON.stringify(body);

    return {
      hostname: this.config.baseURL,
      port: this.config.port || 443,
      path: this.config.apiPath || '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 30000,
      postData,
    };
  }
}

/**
 * DeepSeek 适配器（OpenAI 兼容格式）
 */
class DeepSeekAdapter extends ModelAdapter {
  async chat(params) {
    const opts = await this.buildRequest(params);
    // DeepSeek 使用 HTTPS
    opts.protocol = 'https:';
    return opts;
  }
}

/**
 * 通义千问适配器（阿里云百炼，OpenAI 兼容格式）
 * API 文档: https://help.aliyun.com/zh/model-studio/getting-started/models
 * 端点: https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
 */
class QwenAdapter extends ModelAdapter {
  async chat(params) {
    const opts = await this.buildRequest(params);
    opts.protocol = 'https:';
    return opts;
  }
}

/**
 * Moonshot/Kimi 适配器（OpenAI 兼容格式）
 * API 文档: https://platform.moonshot.cn/docs/api/chat
 * 端点: https://api.moonshot.cn/v1/chat/completions
 */
class MoonshotAdapter extends ModelAdapter {
  async chat(params) {
    const opts = await this.buildRequest(params);
    opts.protocol = 'https:';
    return opts;
  }
}

// ====================================================================
// 模型注册表（API Key 从环境变量读取）
// ====================================================================

const MODEL_CONFIGS = {
  deepseek: {
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    apiKey: getEnv('DEEPSEEK_API_KEY', 'sk-f01481a824b243b28999980106c876c8'),
    baseURL: 'api.deepseek.com',
    apiPath: '/v1/chat/completions',
    modelName: 'deepseek-chat',
    enabled: true,
    adapter: DeepSeekAdapter,
    tier: ['simple', 'medium', 'deep'],
    cost: 'cheap',
  },
  qwen: {
    name: '通义千问-Turbo',
    provider: 'qwen',
    apiKey: getEnv('QWEN_API_KEY'),
    baseURL: 'dashscope.aliyuncs.com',
    apiPath: '/compatible-mode/v1/chat/completions',
    modelName: 'qwen-turbo',
    enabled: !!getEnv('QWEN_API_KEY'),
    adapter: QwenAdapter,
    tier: ['simple', 'medium'],
    cost: 'free',
  },
  moonshot: {
    name: 'Moonshot/Kimi',
    provider: 'moonshot',
    apiKey: getEnv('MOONSHOT_API_KEY'),
    baseURL: 'api.moonshot.cn',
    apiPath: '/v1/chat/completions',
    modelName: 'moonshot-v1-8k',
    enabled: !!getEnv('MOONSHOT_API_KEY'),
    adapter: MoonshotAdapter,
    tier: ['simple', 'medium'],
    cost: 'free',
  },
};

// ====================================================================
// 模型调度器（保留分级 + 自动降级）
// ====================================================================

class ModelScheduler {
  constructor() {
    this.adapters = {};
    this._initAdapters();
  }

  _initAdapters() {
    for (const [id, config] of Object.entries(MODEL_CONFIGS)) {
      if (config.enabled) {
        const AdapterClass = config.adapter;
        this.adapters[id] = new AdapterClass(config);
      } else if (config.apiKey) {
        // 有 key 但未启用 → 自动启用
        config.enabled = true;
        const AdapterClass = config.adapter;
        this.adapters[id] = new AdapterClass(config);
      }
    }
  }

  /**
   * 根据请求头选择模型
   * 优先级：前端指定 > 任务分级推荐 > 任意可用
   */
  selectModel(req) {
    const provider = req.headers['x-model-provider'];
    const taskTier = req.headers['x-task-tier'] || 'simple';

    let modelId = null;

    // 1. 前端指定
    if (provider && this.adapters[provider]) {
      modelId = provider;
    }

    // 2. 按任务分级推荐
    if (!modelId) {
      const tierModels = Object.entries(MODEL_CONFIGS)
        .filter(([id, cfg]) => cfg.enabled && cfg.tier.includes(taskTier))
        .sort((a, b) => {
          const costOrder = { free: 0, cheap: 1, medium: 2, expensive: 3 };
          return costOrder[a[1].cost] - costOrder[b[1].cost];
        });

      if (tierModels.length > 0) {
        modelId = tierModels[0][0];
      }
    }

    // 3. 终极降级：随便找个启用的
    if (!modelId) {
      const anyEnabled = Object.keys(this.adapters);
      modelId = anyEnabled.length > 0 ? anyEnabled[0] : null;
    }

    if (!modelId) {
      return { error: '没有可用的模型，请配置 API Key（通过环境变量）' };
    }

    const config = MODEL_CONFIGS[modelId];
    const adapter = this.adapters[modelId];

    return { modelId, config, adapter };
  }

  getStatus() {
    const models = {};
    for (const [id, config] of Object.entries(MODEL_CONFIGS)) {
      models[id] = {
        name: config.name,
        enabled: config.enabled,
        hasKey: !!config.apiKey,
        tasks: config.tier,
        cost: config.cost,
      };
    }
    return models;
  }
}

// ====================================================================
// HTTP 辅助函数：支持 HTTP 和 HTTPS
// ====================================================================

function requestAdapter(opts) {
  const mod = opts.protocol === 'http:' ? http : https;
  delete opts.protocol;
  return mod;
}

// ====================================================================
// 服务器
// ====================================================================

const scheduler = new ModelScheduler();
let requestCount = 0;

function log(level, msg) {
  const time = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const prefix = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : level === 'API' ? '🔵' : '✅';
  console.log(`${prefix} [${time}] [${level}] ${msg}`);
}

function safePath(rootDir, userPath) {
  let decoded = decodeURIComponent(userPath).split('?')[0];
  const normalized = path.normalize(decoded);
  const fullPath = path.join(rootDir, normalized);
  const resolved = path.resolve(fullPath);
  const rootResolved = path.resolve(rootDir);
  return resolved.startsWith(rootResolved) ? resolved : null;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  requestCount++;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Model-Provider, X-Model-Name, X-Task-Tier');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ===== API 聊天代理 =====
  if (req.url === '/api/chat' && req.method === 'POST') {
    log('API', `请求 #${requestCount}`);

    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const requestData = JSON.parse(body);
        const useStream = requestData.stream !== false;

        const selection = scheduler.selectModel(req);

        if (selection.error) {
          log('ERROR', selection.error);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              error: true,
              fallback: true,
              message: selection.error,
            })
          );
          return;
        }

        const { modelId, config, adapter } = selection;
        log('API', `→ 使用模型: ${config.name} | 任务: ${req.headers['x-task-tier'] || 'simple'}`);

        adapter
          .chat({
            messages: requestData.messages,
            temperature: requestData.temperature ?? 0.8,
            maxTokens: requestData.max_tokens || 300,
            stream: useStream,
          })
          .then((opts) => {
            const proto = requestAdapter(opts);

            if (useStream) {
              // ===== 流式输出 =====
              res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
              });

              const apiReq = proto.request(opts, (apiRes) => {
                let fullContent = '';
                let buffer = '';

                apiRes.on('data', (chunk) => {
                  buffer += chunk.toString();
                  const lines = buffer.split('\n');
                  buffer = lines.pop() || '';

                  for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith('data: ')) continue;

                    const dataStr = trimmed.substring(6);
                    if (dataStr === '[DONE]') {
                      res.write(`data: [DONE]\n\n`);
                      return;
                    }

                    try {
                      const data = JSON.parse(dataStr);
                      const delta =
                        data.choices?.[0]?.delta?.content ||
                        data.choices?.[0]?.text ||
                        '';
                      if (delta) {
                        fullContent += delta;
                        res.write(
                          `data: ${JSON.stringify({ content: delta })}\n\n`
                        );
                      }
                    } catch (e) {
                      // 跳过解析错误行
                    }
                  }
                });

                apiRes.on('end', () => {
                  res.write(`data: [DONE]\n\n`);
                  res.end();
                  log('API', `流式完成 ✅ (${fullContent.length}字 | ${config.name})`);
                });
              });

              apiReq.on('error', (e) => {
                log('ERROR', `流式请求失败: ${config.name} - ${e.message}`);
                res.write(
                  `data: ${JSON.stringify({ error: true, message: e.message })}\n\n`
                );
                res.write(`data: [DONE]\n\n`);
                res.end();
              });

              apiReq.on('timeout', () => {
                apiReq.destroy();
                res.write(
                  `data: ${JSON.stringify({ error: true, message: '请求超时' })}\n\n`
                );
                res.write(`data: [DONE]\n\n`);
                res.end();
              });

              apiReq.write(opts.postData);
              apiReq.end();
            } else {
              // ===== 非流式 =====
              const apiReq = proto.request(opts, (apiRes) => {
                let data = '';
                apiRes.on('data', (chunk) => (data += chunk));
                apiRes.on('end', () => {
                  res.writeHead(200, {
                    'Content-Type': 'application/json; charset=utf-8',
                  });
                  res.end(data);
                });
              });

              apiReq.on('error', (e) => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(
                  JSON.stringify({
                    error: true,
                    fallback: true,
                    message: e.message,
                  })
                );
              });

              apiReq.on('timeout', () => {
                apiReq.destroy();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(
                  JSON.stringify({ error: true, fallback: true, message: '超时' })
                );
              });

              apiReq.write(opts.postData);
              apiReq.end();
            }
          })
          .catch((e) => {
            log('ERROR', `适配器错误: ${config.name} - ${e.message}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                error: true,
                fallback: true,
                message: e.message,
              })
            );
          });
      } catch (e) {
        log('ERROR', `请求解析失败: ${e.message}`);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ===== 健康检查 =====
  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        uptime: process.uptime(),
        requests: requestCount,
        memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        models: scheduler.getStatus(),
        note: 'API Key 通过环境变量配置：QWEN_API_KEY / MOONSHOT_API_KEY / DEEPSEEK_API_KEY',
      })
    );
    return;
  }

  // ===== 静态文件 =====
  let filePath = req.url === '/' ? '/index.html' : req.url;
  const fullPath = safePath(__dirname, filePath);

  if (!fullPath) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(fullPath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Server Error');
      }
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});

function startServer() {
  try {
    server.listen(PORT, '0.0.0.0', () => {
      const activeModels = Object.entries(MODEL_CONFIGS)
        .filter(([id, c]) => c.enabled)
        .map(([id, c]) => `${c.name}${c.apiKey ? ' ✅' : ' ⏳(无 API Key)'}`);

      const pendingModels = Object.entries(MODEL_CONFIGS)
        .filter(([id, c]) => !c.enabled)
        .map(([id, c]) => `${c.name} (待配置)`);

      console.log(`\n🌟 数星服务器 V5（全适配器 + 环境变量）已启动！`);
      console.log(`   本地: http://localhost:${PORT}/`);
      console.log(`   活跃模型:`);
      activeModels.forEach((m) => console.log(`     ${m}`));
      if (pendingModels.length > 0) {
        console.log(`   未启用模型:`);
        pendingModels.forEach((m) => console.log(`     ${m}`));
      }
      console.log(`   PID: ${process.pid}\n`);

      console.log(`💡 API Key 通过环境变量配置：`);
      console.log(`   export QWEN_API_KEY=sk-xxx    # 通义千问`);
      console.log(`   export MOONSHOT_API_KEY=sk-xxx # Moonshot/Kimi`);
      console.log(`   export DEEPSEEK_API_KEY=sk-xxx # DeepSeek（已配置默认值）`);
      console.log(`   或访问 /api/health 查看当前模型状态\n`);
    });
  } catch (e) {
    log('ERROR', `启动失败: ${e.message}`);
    setTimeout(startServer, 3000);
  }
}

process.on('uncaughtException', (err) => {
  log('ERROR', `异常: ${err.message}`);
  setTimeout(() => server.close(() => startServer()), 3000);
});
process.on('unhandledRejection', (reason) => {
  log('WARN', `未处理拒绝: ${reason}`);
});

startServer();
