// 简单的本地开发服务器
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain'
};

const server = http.createServer((req, res) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    
    // 处理根路径
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);
    
    // 获取文件扩展名
    const extname = path.extname(filePath);
    let contentType = MIME_TYPES[extname] || 'application/octet-stream';
    
    // 读取文件
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // 文件不存在
                fs.readFile(path.join(__dirname, '404.html'), (err, notFoundContent) => {
                    if (err) {
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end('<h1>404 Not Found</h1><p>页面不存在</p>');
                    } else {
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end(notFoundContent, 'utf-8');
                    }
                });
            } else {
                // 服务器错误
                res.writeHead(500);
                res.end(`服务器错误: ${error.code}`);
            }
        } else {
            // 成功响应
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 数星开发服务器已启动！`);
    console.log(`📁 本地访问: http://localhost:${PORT}`);
    console.log(`📁 网络访问: http://${getLocalIP()}:${PORT}`);
    console.log(`\n📋 可用页面:`);
    console.log(`   • 首页: http://localhost:${PORT}/`);
    console.log(`   • 人格设置: http://localhost:${PORT}/setup.html`);
    console.log(`\n🛠️ 按 Ctrl+C 停止服务器`);
});

// 获取本地IP地址
function getLocalIP() {
    const interfaces = require('os').networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n👋 正在关闭服务器...');
    server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
    });
});

// 创建404页面
const notFoundPage = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>页面未找到 - 数星</title>
    <style>
        body {
            font-family: 'Noto Sans SC', sans-serif;
            background: linear-gradient(135deg, #f8f9ff, #e6e9ff);
            color: #4a4a6a;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            text-align: center;
        }
        
        .error-container {
            max-width: 600px;
            padding: 40px;
            background: white;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(138, 141, 255, 0.1);
        }
        
        h1 {
            color: #8a8dff;
            font-size: 3rem;
            margin-bottom: 20px;
        }
        
        p {
            font-size: 1.1rem;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        
        .home-link {
            display: inline-block;
            padding: 12px 24px;
            background: linear-gradient(135deg, #8a8dff, #6c9bcf);
            color: white;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 500;
            transition: transform 0.3s ease;
        }
        
        .home-link:hover {
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="error-container">
        <h1>404</h1>
        <p>哎呀，这个页面好像迷路了...</p>
        <p>它可能被星光带到了别的地方，或者还没有被创建。</p>
        <a href="/" class="home-link">返回首页</a>
    </div>
</body>
</html>
`;

// 写入404页面
fs.writeFileSync(path.join(__dirname, '404.html'), notFoundPage);