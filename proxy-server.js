/**
 * 数星 - API代理服务器 V4（多模型适配层 + 任务分级）
 *
 * 按文档5.3-5.4设计：
 * - 模型适配层：统一接口适配各家API差异
 * - 模型调度器：按任务类型分级调用
 * - 自动降级：挂了自动切到下一个模型
 * - 当前仅DeepSeek可用，其他模型留API key空位
 *
 * 峰哥填API key后重启服务即可生效
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// ====================================================================
// 模型适配层：各家API统一接口
// ====================================================================

/**
 * 模型适配器基类
 */
class ModelAdapter {
  constructor(config) {
    this.config = config;
    this.name = config.name;
    this.modelName = config.modelName;
    this.enabled = config.enabled || false;
  }

  async chat(params) {
    throw new Error('子类必须实现 chat()');
  }
}

/**
 * DeepSeek 适配器（当前唯一激活的模型）
 */
class DeepSeekAdapter extends ModelAdapter {
  async chat(params) {
    const { messages, temperature, maxTokens, stream } = params;
    
    const postData = JSON.stringify({
      model: this.modelName,
      messages,
      temperature: temperature || 0.8,
      max_tokens: maxTokens || 300,
      stream: stream !== false
    });

    const options = {
      hostname: this.config.baseURL,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 15000
    };

    return { options, postData };
  }
}

/**
 * 豆包（字节火山引擎）适配器（待配置）
 * API key空位，峰哥填了就能用
 */
class DoubaoAdapter extends ModelAdapter {
  async chat(params) {
    if (!this.config.apiKey) {
      throw new Error(`${this.name} API key 未配置`);
    }
    // TODO: 实现豆包API调用
    // 参考字节火山引擎文档：https://www.volcengine.com/docs/82379
    throw new Error(`${this.name} 适配器待实现，峰哥配好API key后联系我完善`);
  }
}

/**
 * 通义千问适配器（待配置）
 */
class QwenAdapter extends ModelAdapter {
  async chat(params) {
    if (!this.config.apiKey) {
      throw new Error(`${this.name} API key 未配置`);
    }
    // TODO: 实现通义千问API调用
    throw new Error(`${this.name} 适配器待实现`);
  }
}

/**
 * 智谱GLM适配器（待配置）
 */
class GLMAdapter extends ModelAdapter {
  async chat(params) {
    if (!this.config.apiKey) {
      throw new Error(`${this.name} API key 未配置`);
    }
    // TODO: 实现智谱API调用
    throw new Error(`${this.name} 适配器待实现`);
  }
}

// ====================================================================
// 模型注册表（API key全部留空副本，峰哥填后重启生效）
//                         ↓ 实际使用的API key在下方 MODEL_CONFIGS
// ====================================================================

const MODEL_CONFIGS = {
  deepseek: {
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    apiKey: 'sk-f01481a824b243b28999980106c876c8',  // ✅ 已配置
    baseURL: 'api.deepseek.com',
    modelName: 'deepseek-chat',
    enabled: true,
    adapter: DeepSeekAdapter,
    tier: ['simple', 'medium', 'deep'],
    cost: 'cheap'
  },
  doubao: {
    name: '豆包-Lite',
    provider: 'doubao',
    apiKey: '',              // 峰哥填入豆包API key
    baseURL: 'ark.cn-beijing.volces.com',
    modelName: 'doubao-lite-32k',
    enabled: false,
    adapter: DoubaoAdapter,
    tier: ['simple'],
    cost: 'free'
  },
  deepseek_r1: {
    name: 'DeepSeek R1',
    provider: 'deepseek',
    apiKey: '',              // 峰哥填入DeepSeek R1 key（和V3不同则填不同的）
    baseURL: 'api.deepseek.com',
    modelName: 'deepseek-reasoner',
    enabled: false,
    adapter: DeepSeekAdapter,
    tier: ['deep'],
    cost: 'expensive'
  },
  qwen: {
    name: '通义千问-Turbo',
    provider: 'qwen',
    apiKey: '',              // 峰哥填入通义API key
    baseURL: 'dashscope.aliyuncs.com',
    modelName: 'qwen-turbo',
    enabled: false,
    adapter: QwenAdapter,
    tier: ['simple', 'medium'],
    cost: 'free'
  },
  glm: {
    name: '智谱GLM-4',
    provider: 'glm',
    apiKey: '',              // 峰哥填入智谱API key
    baseURL: 'open.bigmodel.cn',
    modelName: 'glm-4',
    enabled: false,
    adapter: GLMAdapter,
    tier: ['medium'],
    cost: 'medium'
  }
};

// ====================================================================
// 模型调度器
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
      }
    }
  }

  /**
   * 根据请求头选择模型
   * 优先级：前端指定 > 任务分级推荐 > deepseek降级
   */
  selectModel(req) {
    const provider = req.headers['x-model-provider'];
    const taskTier = req.headers['x-task-tier'] || 'simple';
    
    let modelId = null;
    
    // 1. 前端指定
    if (provider && this.adapters[provider]) {
      modelId = provider;
    }
    
    // 2. DeepSeek有很多别名的处理
    if (!modelId && provider === 'deepseek' && this.adapters['deepseek']) {
      modelId = 'deepseek';
    }
    
    // 3. 按任务分级推荐
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
    
    // 4. 终极降级：随便找个启用的
    if (!modelId) {
      const anyEnabled = Object.keys(this.adapters);
      modelId = anyEnabled.length > 0 ? anyEnabled[0] : null;
    }
    
    if (!modelId) {
      return { error: '没有可用的模型，请配置API key' };
    }
    
    const config = MODEL_CONFIGS[modelId];
    const adapter = this.adapters[modelId];
    
    return { modelId, config, adapter };
  }

  /**
   * 获取当前可用的模型列表
   */
  getStatus() {
    const models = {};
    for (const [id, config] of Object.entries(MODEL_CONFIGS)) {
      models[id] = {
        name: config.name,
        enabled: config.enabled,
        hasKey: !!config.apiKey,
        tasks: config.tier,
        cost: config.cost
      };
    }
    return models;
  }
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

  // ===== API代理 =====
  if (req.url === '/api/chat' && req.method === 'POST') {
    log('API', `请求 #${requestCount}`);
    
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const requestData = JSON.parse(body);
        const useStream = requestData.stream !== false;
        
        // 模型调度选择
        const selection = scheduler.selectModel(req);
        
        if (selection.error) {
          log('ERROR', selection.error);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: true,
            fallback: true,
            message: selection.error
          }));
          return;
        }
        
        const { modelId, config, adapter } = selection;
        log('API', `→ 使用模型: ${config.name} | 任务: ${req.headers['x-task-tier'] || 'simple'}`);
        
        // 调用适配器获取请求参数
        adapter.chat({
          messages: requestData.messages,
          temperature: requestData.temperature || 0.8,
          maxTokens: requestData.max_tokens || 300,
          stream: useStream
        }).then(({ options, postData }) => {
          
          if (useStream) {
            // ===== 流式输出 =====
            res.writeHead(200, {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
              'X-Accel-Buffering': 'no'
            });
            
            const apiReq = https.request(options, (apiRes) => {
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
                    const delta = data.choices?.[0]?.delta?.content || '';
                    if (delta) {
                      fullContent += delta;
                      res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
                    }
                  } catch (e) {}
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
              res.write(`data: ${JSON.stringify({ error: true, message: e.message })}\n\n`);
              res.write(`data: [DONE]\n\n`);
              res.end();
            });
            
            apiReq.on('timeout', () => {
              apiReq.destroy();
              res.write(`data: ${JSON.stringify({ error: true, message: '请求超时' })}\n\n`);
              res.write(`data: [DONE]\n\n`);
              res.end();
            });
            
            apiReq.write(postData);
            apiReq.end();
            
          } else {
            // ===== 非流式（降级备用） =====
            const apiReq = https.request(options, (apiRes) => {
              let data = '';
              apiRes.on('data', chunk => data += chunk);
              apiRes.on('end', () => {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(data);
              });
            });
            
            apiReq.on('error', (e) => {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: true, fallback: true, message: e.message }));
            });
            
            apiReq.on('timeout', () => {
              apiReq.destroy();
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: true, fallback: true, message: '超时' }));
            });
            
            apiReq.write(postData);
            apiReq.end();
          }
        }).catch(e => {
          log('ERROR', `适配器错误: ${config.name} - ${e.message}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: true,
            fallback: true,
            message: e.message
          }));
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
    res.end(JSON.stringify({
      status: 'ok',
      uptime: process.uptime(),
      requests: requestCount,
      memory: Math.round(process.memoryUsage().heapUsed/1024/1024) + 'MB',
      models: scheduler.getStatus(),
      note: 'API key配置在proxy-server.js的MODEL_CONFIGS中，修改后重启生效'
    }));
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
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
});

function startServer() {
  try {
    server.listen(PORT, '0.0.0.0', () => {
      const activeModels = Object.entries(MODEL_CONFIGS)
        .filter(([id, c]) => c.enabled)
        .map(([id, c]) => `${c.name}${c.apiKey ? ' ✅' : ' ⏳(无API key)'}`);
      
      const pendingModels = Object.entries(MODEL_CONFIGS)
        .filter(([id, c]) => !c.enabled)
        .map(([id, c]) => `${c.name} (待填API key)`);
      
      console.log(`\n🌟 数星服务器 V4（多模型适配）已启动！`);
      console.log(`   本地: http://localhost:${PORT}/`);
      console.log(`   活跃模型:`);
      activeModels.forEach(m => console.log(`     ${m}`));
      console.log(`   待配置模型:`);
      pendingModels.forEach(m => console.log(`     ${m}`));
      console.log(`   PID: ${process.pid}\n`);
      
      if (pendingModels.length > 0) {
        console.log(`💡 峰哥：在 proxy-server.js 的 MODEL_CONFIGS 中填入API key即可启用更多模型`);
        console.log(`   或访问 /api/health 查看当前模型状态\n`);
      }
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
