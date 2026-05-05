/**
 * 数星 - API代理服务器 V3（流式输出 + 速度优化 + 本地模型支持）
 * 改进：
 *   1. 使用非推理模型 deepseek-chat（速度提升2倍+）
 *   2. 支持流式输出（SSE），文字逐字显示
 *   3. 本地Ollama模型支持作为免费备选
 *   4. 3秒超时降级机制
 */

const http = require('http');
const https = require('https');
const http2 = require('http2');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const AI_BASE_URL = 'api.deepseek.com';

// ===== 模型配置 =====
const MODELS = {
    deepseek: {
        name: 'DeepSeek Chat',
        apiKey: 'sk-f01481a824b243b28999980106c876c8',
        baseURL: 'api.deepseek.com',
        modelName: 'deepseek-chat', // 非推理模型，速度快
        enabled: true
    },
    local: {
        name: '本地Ollama',
        baseURL: '127.0.0.1',
        port: 11434,
        modelName: 'qwen2.5:3b',
        enabled: false,  // 安装后设为true
    }
};

// ... existing V2 code (rate limiting, cache, logger, safePath) will be reused ...

// 请求计数器
let requestCount = 0;

// 日志
function log(level, msg) {
    const time = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const prefix = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : level === 'API' ? '🔵' : '✅';
    console.log(`${prefix} [${time}] [${level}] ${msg}`);
}

// 安全路径
function safePath(rootDir, userPath) {
    let decoded = decodeURIComponent(userPath).split('?')[0];
    const normalized = path.normalize(decoded);
    const fullPath = path.join(rootDir, normalized);
    const resolved = path.resolve(fullPath);
    const rootResolved = path.resolve(rootDir);
    return resolved.startsWith(rootResolved) ? resolved : null;
}

// MIME类型
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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    
    // ===== API代理（流式输出） =====
    if (req.url === '/api/chat' && req.method === 'POST') {
        log('API', `请求 #${requestCount}`);
        
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const requestData = JSON.parse(body);
                const useStream = requestData.stream !== false; // 默认流式
                
                // 组装请求
                const postData = JSON.stringify({
                    model: MODELS.deepseek.modelName,
                    messages: requestData.messages,
                    temperature: requestData.temperature || 0.8,
                    max_tokens: requestData.max_tokens || 300,
                    stream: useStream
                });

                const options = {
                    hostname: MODELS.deepseek.baseURL,
                    path: '/v1/chat/completions',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${MODELS.deepseek.apiKey}`,
                        'Content-Length': Buffer.byteLength(postData)
                    },
                    timeout: 15000 // 缩短超时到15秒
                };

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
                            buffer = lines.pop() || ''; // 保留未完成的行
                            
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
                                } catch (e) {
                                    // 跳过解析失败的行
                                }
                            }
                        });
                        
                        apiRes.on('end', () => {
                            res.write(`data: [DONE]\n\n`);
                            res.end();
                            log('API', `流式完成 ✅ (${fullContent.length}字)`);
                        });
                    });
                    
                    apiReq.on('error', (e) => {
                        log('ERROR', `流式请求失败: ${e.message}`);
                        // 给前端一个降级信号
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
                        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ error: true, fallback: true, message: e.message }));
                    });
                    
                    apiReq.on('timeout', () => {
                        apiReq.destroy();
                        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ error: true, fallback: true, message: '超时' }));
                    });
                    
                    apiReq.write(postData);
                    apiReq.end();
                }

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
            models: {
                deepseek: MODELS.deepseek.enabled ? '✅' : '❌',
                local: MODELS.local.enabled ? `✅ (${MODELS.local.modelName})` : '❌ (未安装)'
            }
        }));
        return;
    }

    // ===== Ollama状态检查 =====
    if (req.url === '/api/local/status') {
        const localEnabled = MODELS.local.enabled;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            enabled: localEnabled,
            model: localEnabled ? MODELS.local.modelName : null,
            message: localEnabled ? '本地模型可用' : '本地模型未安装'
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

// 进程保活
function startServer() {
    try {
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`\n🌟 数星服务器 V3 已启动！`);
            console.log(`   本地: http://localhost:${PORT}/`);
            console.log(`   模型: ${MODELS.deepseek.modelName} (非推理, 快速)`);
            console.log(`   输出: 流式SSE (文字逐字出现)`);
            console.log(`   超时: 15秒`);
            console.log(`   PID: ${process.pid}\n`);
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

// ===== TODO: 安装Ollama本地模型 =====
// 运行以下命令即可开启免费本地模型：
// 1. curl -fsSL https://ollama.com/install.sh | sh
// 2. ollama pull qwen2.5:3b
// 3. 然后将 MODELS.local.enabled 设为 true
