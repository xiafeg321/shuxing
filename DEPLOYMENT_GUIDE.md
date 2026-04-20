# 数星项目部署和备份指南

## 🚀 快速部署指南

### 本地开发环境部署

#### 方法一：Python HTTP服务器 (推荐)
```bash
# 进入项目目录
cd 数星-网页原型

# 启动服务器 (端口3000)
python3 -m http.server 3000

# 或者指定其他端口
python3 -m http.server 8080
```

#### 方法二：Node.js HTTP服务器
```bash
# 使用Node.js的http-server
npx http-server 数星-网页原型 -p 3000

# 或者全局安装后使用
npm install -g http-server
http-server 数星-网页原型 -p 3000
```

#### 方法三：使用项目自带的server.js
```bash
# 确保在项目目录中
cd 数星-网页原型

# 运行Node.js服务器
node server.js
```

### 访问地址
- **本地访问**: http://localhost:3000/
- **局域网访问**: http://[你的IP地址]:3000/
- **测试页面**: http://localhost:3000/test.html

## ☁️ 云端部署选项

### 选项一：GitHub Pages (免费)
```bash
# 1. 在GitHub创建新仓库
# 2. 将代码推送到GitHub
git remote add origin https://github.com/你的用户名/数星.git
git branch -M main
git push -u origin main

# 3. 在GitHub仓库设置中启用GitHub Pages
# 设置 Source 为 main 分支 /docs 文件夹 或 根目录
```

**GitHub Pages访问地址**: https://你的用户名.github.io/数星/

### 选项二：Vercel (免费，推荐)
1. 访问 https://vercel.com/
2. 使用GitHub账号登录
3. 导入数星项目仓库
4. 点击部署，无需额外配置

**Vercel访问地址**: https://数星.vercel.app/

### 选项三：Netlify (免费)
1. 访问 https://www.netlify.com/
2. 使用GitHub账号登录
3. 拖拽项目文件夹或连接GitHub仓库
4. 点击部署

**Netlify访问地址**: https://随机名称.netlify.app/

### 选项四：自有服务器
```bash
# 1. 将文件上传到服务器
scp -r 数星-网页原型/* 用户名@服务器地址:/var/www/数星/

# 2. 配置Nginx
sudo nano /etc/nginx/sites-available/数星

# Nginx配置示例
server {
    listen 80;
    server_name shuxing.yourdomain.com;
    root /var/www/数星;
    index index.html;
    
    location / {
        try_files $uri $uri/ =404;
    }
}

# 3. 启用站点并重启Nginx
sudo ln -s /etc/nginx/sites-available/数星 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 💾 备份和恢复指南

### 完整项目备份
```bash
# 1. 创建备份压缩包
tar -czf 数星-备份-$(date +%Y%m%d).tar.gz 数星-网页原型/

# 2. 备份到其他位置
cp 数星-备份-*.tar.gz ~/备份/
cp 数星-备份-*.tar.gz /mnt/外部存储/
```

### Git版本控制备份
```bash
# 1. 提交所有更改
cd 数星-网页原型
git add .
git commit -m "备份: $(date)"

# 2. 推送到远程仓库
git push origin main

# 3. 创建备份标签
git tag -a 备份-$(date +%Y%m%d) -m "项目备份"
git push origin --tags
```

### 关键文件备份
需要定期备份的关键文件：
1. `data/traits.json` - 人格特征数据
2. `js/` 目录 - 所有JavaScript逻辑
3. `PROJECT_STATUS.md` - 项目状态报告
4. `数星-情感陪伴项目.md` - 项目需求文档

### 数据恢复步骤
如果遇到数据丢失或损坏：

#### 恢复方法一：从Git恢复
```bash
# 1. 检查历史版本
cd 数星-网页原型
git log --oneline

# 2. 恢复到指定版本
git checkout 提交哈希值

# 3. 或恢复到最新版本
git checkout main
git pull origin main
```

#### 恢复方法二：从备份文件恢复
```bash
# 1. 解压备份文件
tar -xzf 数星-备份-20260420.tar.gz

# 2. 替换损坏的文件
cp -r 数星-备份-20260420/数星-网页原型/* 数星-网页原型/
```

#### 恢复方法三：用户数据恢复
由于使用localStorage，用户数据在浏览器中：
1. **导出对话记录**: 在对话页面点击"导出对话"
2. **备份设置**: 手动记录星座和MBTI选择
3. **重新设置**: 如果数据丢失，重新进行人格设置

## 🔧 故障排除

### 常见问题及解决方案

#### 问题1：页面无法访问
```
症状: 浏览器显示"无法连接"或"拒绝访问"
可能原因:
  1. 服务器未启动
  2. 端口被占用
  3. 防火墙阻止

解决方案:
  1. 检查服务器是否运行: ps aux | grep "http.server"
  2. 更换端口: python3 -m http.server 8080
  3. 检查防火墙: sudo ufw allow 3000/tcp
```

#### 问题2：功能不正常
```
症状: 按钮无反应，选择无效
可能原因:
  1. JavaScript错误
  2. 文件加载失败
  3. 浏览器兼容性问题

解决方案:
  1. 打开浏览器开发者工具查看控制台错误
  2. 访问 http://localhost:3000/debug-test.html 进行诊断
  3. 尝试其他浏览器 (Chrome/Edge/Firefox)
```

#### 问题3：数据不保存
```
症状: 刷新页面后设置丢失
可能原因:
  1. 浏览器隐私模式
  2. localStorage被清除
  3. 代码错误

解决方案:
  1. 退出隐私模式
  2. 检查浏览器设置是否阻止localStorage
  3. 使用 debug-test.html 测试存储功能
```

#### 问题4：界面显示异常
```
症状: 布局错乱，样式丢失
可能原因:
  1. CSS文件加载失败
  2. 网络问题
  3. 缓存问题

解决方案:
  1. 强制刷新: Ctrl+F5 或 Cmd+Shift+R
  2. 清除浏览器缓存
  3. 检查网络连接
```

### 紧急恢复流程

#### 步骤1：诊断问题
```bash
# 检查服务器状态
curl -I http://localhost:3000/

# 检查文件完整性
find 数星-网页原型 -name "*.html" -exec wc -l {} \;

# 检查JavaScript语法
cd 数星-网页原型
for js in js/*.js; do node -c "$js" && echo "$js: ✅" || echo "$js: ❌"; done
```

#### 步骤2：快速修复
```bash
# 1. 重启服务器
pkill -f "http.server"
cd 数星-网页原型 && python3 -m http.server 3000 &

# 2. 恢复最近备份
git checkout -- .

# 3. 清除浏览器数据 (用户操作)
# 注意: 这会清除localStorage中的用户数据
```

#### 步骤3：验证修复
```bash
# 1. 访问测试页面
open http://localhost:3000/test.html

# 2. 运行所有测试
# 在测试页面点击所有测试按钮

# 3. 验证核心功能
# - 人格设置流程
# - 对话功能
# - 数据保存
```

## 📊 监控和维护

### 日常检查清单
- [ ] 服务器运行状态
- [ ] 页面可访问性
- [ ] 核心功能正常
- [ ] 数据保存正常
- [ ] 错误日志检查

### 定期维护任务
- **每日**: 检查服务器日志，备份关键数据
- **每周**: 更新项目状态报告，测试所有功能
- **每月**: 完整备份，检查依赖更新

### 性能监控指标
1. **页面加载时间**: 应小于3秒
2. **功能响应时间**: 应小于1秒
3. **存储使用量**: localStorage使用情况
4. **错误率**: JavaScript错误数量

## 🛡️ 安全注意事项

### 数据安全
1. **本地存储**: 所有数据保存在用户浏览器，不上传服务器
2. **隐私保护**: 无需注册，无需个人信息
3. **数据导出**: 用户可随时导出自己的对话记录

### 应用安全
1. **输入验证**: 所有用户输入进行基本验证
2. **XSS防护**: 避免直接插入用户内容到HTML
3. **资源限制**: 限制聊天记录长度和存储大小

### 部署安全
1. **HTTPS**: 生产环境必须使用HTTPS
2. **CORS配置**: 如果需要API，正确配置CORS
3. **文件权限**: 服务器文件权限设置正确

## 🔄 更新和升级

### 小版本更新
```bash
# 1. 备份当前版本
git tag v0.1.1-备份

# 2. 进行修改
# 修改代码...

# 3. 测试修改
# 访问测试页面验证

# 4. 提交更新
git add .
git commit -m "更新: 修复xxx问题"
git tag v0.1.1
git push origin main --tags
```

### 大版本升级
1. **创建新分支**: `git checkout -b v0.2.0`
2. **进行重大修改**: 保持向后兼容或提供迁移方案
3. **充分测试**: 所有功能回归测试
4. **文档更新**: 更新所有相关文档
5. **发布**: 合并到main，打标签，部署

### 回滚流程
```bash
# 1. 查看版本历史
git log --oneline --graph

# 2. 回滚到指定版本
git checkout 目标版本哈希值

# 3. 强制推送到远程 (谨慎操作)
git push -f origin main

# 4. 重新部署
# 根据部署方式重新部署
```

## 📞 支持联系方式

### 问题报告渠道
1. **GitHub Issues**: 代码相关问题
2. **用户反馈**: 应用内反馈功能 (待实现)
3. **邮件支持**: shuxing-support@example.com

### 紧急联系方式
- **技术负责人**: 小七 (当前会话)
- **产品负责人**: 峰哥
- **响应时间**: 工作日24小时内

### 文档资源
1. **项目文档**: `数星-情感陪伴项目.md`
2. **状态报告**: `PROJECT_STATUS.md`
3. **部署指南**: 本文件
4. **用户手册**: `README.md` (待完善)

---

**最后更新**: 2026-04-20  
**维护者**: 数星开发团队

---
*稳定可靠的部署是项目成功的基础*