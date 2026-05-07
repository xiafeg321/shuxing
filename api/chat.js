/**
 * 数星 - Vercel Serverless API 代理
 * 
 * 部署到 Vercel 后自动运行，无需维护服务器
 * API key 通过 Vercel 环境变量安全配置
 * 
 * 峰哥需在 Vercel 项目设置中配置：
 *   DEEPSEEK_KEY = sk-xxxxx
 * 
 * 也可在 vercel.json 中配置 (开发阶段)
 */

const DEEPSEEK_BASE = 'api.deepseek.com';

export default async function handler(req, res) {
  // CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Model-Provider, X-Model-Name, X-Task-Tier');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, temperature, max_tokens, stream } = req.body;
    
    // 获取 API key：优先环境变量，其次构建时内嵌
    const apiKey = process.env.DEEPSEEK_KEY || 'sk-f01481a824b243b28999980106c876c8';
    
    const useStream = stream !== false;

    if (useStream) {
      // 流式输出
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      const response = await fetch(`https://${DEEPSEEK_BASE}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          temperature: temperature || 0.8,
          max_tokens: max_tokens || 300,
          stream: true,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('DeepSeek API error:', response.status, text);
        res.write(`data: ${JSON.stringify({ error: true, message: 'API error: ' + response.status })}\n\n`);
        res.write('data: [DONE]\n\n');
        return res.end();
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const dataStr = trimmed.substring(6);
          if (dataStr === '[DONE]') {
            res.write('data: [DONE]\n\n');
            continue;
          }
          try {
            const data = JSON.parse(dataStr);
            const delta = data.choices?.[0]?.delta?.content || '';
            if (delta) {
              res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
            }
          } catch (e) {}
        }
      }
      
      res.write('data: [DONE]\n\n');
      res.end();

    } else {
      // 非流式
      const response = await fetch(`https://${DEEPSEEK_BASE}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          temperature: temperature || 0.8,
          max_tokens: max_tokens || 300,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return res.json({ choices: [{ message: { content: data.choices?.[0]?.message?.content || '' } }] });
    }

  } catch (error) {
    console.error('Chat error:', error.message);
    // 给前端降级信号
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: true,
      fallback: true,
      message: error.message
    }));
  }
}
