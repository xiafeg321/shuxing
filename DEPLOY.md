# 数星 生产部署方案

> 正式上线时参考此文档部署
> 服务器推荐：阿里云轻量应用服务器（¥24/月起）

---

## 一、服务器选择

### 推荐配置（最低）
| 配置项 | 规格 |
|--------|------|
| CPU | 1核 |
| 内存 | 1GB |
| 带宽 | 3Mbps |
| 磁盘 | 40GB |
| 系统 | Ubuntu 22.04 LTS |

### 购买渠道
- **阿里云** → 轻量应用服务器（新人首年优惠大）
- **腾讯云** → 轻量云服务器
- **华为云** → HECS 云服务器

---

## 二、架构图

```
用户 → 域名 (shuxing.yourdomain.com)
          ↓
     Cloudflare / DNS
          ↓
     阿里云服务器
     ┌─────────────────────────┐
     │       Nginx (443端口)    │
     │  · HTTPS 证书(Let's Encrypt)│
     │  · Gzip 压缩             │
     │  · 静态文件服务          │
     │  · API 反向代理          │
     └──────┬──────────────────┘
            │
     ┌──────┴──────┐
     │             │
  静态文件        API请求
  (HTML/CSS/JS)   (/api/*)
     │             │
     │     ┌───────┴───────┐
     │     │  Node.js 进程   │
     │     │(PM2 管理保活)   │
     │     │ proxy-server.js │
     │     │ → DeepSeek API  │
     │     └───────────────┘
     │
     └── Nginx 直接返回文件
```

---

## 三、部署脚本

### 3.1 服务器初始化（首次执行）

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git

# 安装 PM2（Node.js 进程管理）
sudo npm install -g pm2

# 克隆项目
cd /var/www
sudo git clone https://github.com/xiafeg321/shuxing.git
sudo chown -R ubuntu:ubuntu shuxing

# 验证
node --version   # v20+
npm --version
pm2 --version
```

### 3.2 Nginx 配置

```nginx
# /etc/nginx/sites-available/shuxing
server {
    listen 80;
    server_name shuxing.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name shuxing.yourdomain.com;

    # SSL 证书（用 certbot 申请）
    ssl_certificate /etc/letsencrypt/live/shuxing.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/shuxing.yourdomain.com/privkey.pem;
    
    # 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 静态文件
    root /var/www/shuxing;
    index index.html;

    # Gzip 压缩
    gzip on;
    gzip_types text/css application/javascript text/html image/svg+xml;
    gzip_min_length 1024;

    # 静态文件直接返回
    location / {
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, no-transform";
    }

    # API 请求转发到 Node.js
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;  # 流式输出需要
        proxy_read_timeout 30s;
    }
}
```

### 3.3 HTTPS 证书

```bash
# 安装 certbot
sudo apt install -y certbot python3-certbot-nginx

# 申请证书（需域名已指向服务器）
sudo certbot --nginx -d shuxing.yourdomain.com

# 自动续期（默认已配定时任务）
sudo certbot renew --dry-run
```

### 3.4 启动服务

```bash
# 进入项目目录
cd /var/www/shuxing

# 安装依赖
npm install

# 用 PM2 启动
pm2 start proxy-server.js --name shuxing -- -p 3000

# 保存 PM2 配置（开机自启）
pm2 save
pm2 startup

# 重启 Nginx
sudo nginx -t && sudo systemctl reload nginx
```

### 3.5 日常维护

```bash
# 查看状态
pm2 status
pm2 logs shuxing

# 更新代码
cd /var/www/shuxing
git pull
pm2 restart shuxing

# 重启服务器
pm2 restart shuxing
sudo systemctl reload nginx
```

---

## 四、域名配置

| 记录类型 | 主机记录 | 记录值 |
|---------|---------|--------|
| A | @ | 服务器公网IP |
| A | www | 服务器公网IP |

---

## 五、费用预估

| 项目 | 月费 |
|------|------|
| 阿里云轻量服务器 | ¥24-50 |
| 域名（.com/.cn） | ¥30-50/年 |
| DeepSeek API | 按量（小批量≈¥0） |
| **合计** | **¥24-50/月** |

---

## 六、扩展规划

### 用户量增长时的升级路径

| 用户量 | 方案 |
|--------|------|
| < 1000 | 1核1G轻量服务器足够 |
| 1000-10000 | 升级到2核4G + Redis缓存 |
| > 10000 | 静态文件上CDN（阿里云OSS+CDN） |
| > 50000 | API独立部署，数据库上云 |
