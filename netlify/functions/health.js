/**
 * 数星 - Netlify 健康检查端点
 * 
 * 用于前端自动检测API是否可用
 * 访问路径：/.netlify/functions/health
 * 通过redirect映射到 /api/health
 */

exports.handler = async () => {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: 'ok',
      platform: 'netlify',
      version: '1.2.0',
    }),
  };
};
