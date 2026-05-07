/**
 * 数星 - Netlify Serverless 函数
 * 
 * 部署到 Netlify 后，此文件作为 API 代理
 * endpoints: /.netlify/functions/chat
 * 
 * 峰哥需在 Netlify 后台设置环境变量：
 *   DEEPSEEK_KEY = sk-xxxxx
 */

const DEEPSEEK_BASE = 'api.deepseek.com';
const API_KEY = process.env.DEEPSEEK_KEY || 'sk-f01481a824b243b28999980106c876c8';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { messages, temperature, max_tokens, stream } = JSON.parse(event.body || '{}');
    const useStream = stream !== false;

    const requestBody = {
      model: 'deepseek-chat',
      messages,
      temperature: temperature || 0.8,
      max_tokens: max_tokens || 300,
      stream: useStream,
    };

    if (useStream) {
      // 流式输出：返回一个base64编码的流代理
      const response = await fetch(`https://${DEEPSEEK_BASE}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        return {
          statusCode: 200,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: true, fallback: true, message: `API error: ${response.status}` }),
        };
      }

      // Netlify 流式支持
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
        body: response.body,
      };

    } else {
      // 非流式
      const response = await fetch(`https://${DEEPSEEK_BASE}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          choices: [{ message: { content: data.choices?.[0]?.message?.content || '' } }]
        }),
      };
    }

  } catch (error) {
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: true, fallback: true, message: error.message }),
    };
  }
};
