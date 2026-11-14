# root 用户直接部署

发布包已包含 Node 运行时。直接解压到 /root/no-see-bye，配置后用 systemd 启动，通过 https://tingjieli.shop 访问。以下命令用 root 执行。

## 1. 解压并加执行权限

在安装包所在目录执行：

```bash
mkdir -p /root
tar -xzf no-see-bye-linux-x64.tar.gz -C /root
cd /root/no-see-bye
chmod +x runtime/node
```

## 2. 生成配置

域名和证书已经配置为 `tingjieli.shop`。密钥自动随机生成，数据库和上传目录首次启动自动创建。

```bash
cat > config.env <<EOF
DATABASE_URL=file:/root/no-see-bye/data/app.db
STORAGE_DRIVER=local
STORAGE_LOCAL_DIR=/root/no-see-bye/data/uploads
JWT_SECRET=$(./runtime/node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
USER_QUOTA_MB=0
ALLOW_REGISTRATION=true
APP_ORIGIN=https://tingjieli.shop
COOKIE_SECURE=false
# GITHUB_CLIENT_ID=your-client-id
# GITHUB_CLIENT_SECRET=your-client-secret
# GITHUB_REDIRECT_URI=https://tingjieli.shop/api/auth/github
EOF
chmod 600 config.env
```

配置完成后，不要每次重启都重新生成 config.env。改配置只需编辑文件并重启服务。后续关闭注册，修改 ALLOW_REGISTRATION=false。

## 3. 配置 systemd 并启动

```bash
cp deploy/systemd/no-see-bye.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now no-see-bye
```

安装并启用 Nginx，让 80/443 反代到本机 3000：`yum install -y nginx`，复制 `deploy/nginx.conf` 到 `/etc/nginx/conf.d/no-see-bye.conf`，执行 `nginx -t && systemctl enable --now nginx`。证书已放在 `/root/certificate`。Nginx 使用 `tingjieli.shop_fullchain.pem`（站点证书在前，中间证书在后）和 `tingjieli.shop.key`；当前服务器已补齐证书链，更换证书时也需同步更新 fullchain 文件。在阿里云 ECS 安全组和服务器防火墙放行 **TCP 80、443**；应用本身仍只监听本机 3000，不需要公网放行 3000。访问 `https://tingjieli.shop` 或 `http://tingjieli.shop` 均可；HTTP 会以明文传输，账号密码和记录内容可能被旁路观察或篡改，建议优先使用 HTTPS。

```bash
systemctl status no-see-bye
journalctl -u no-see-bye -n 50 --no-pager
systemctl restart no-see-bye
```

## 已下载旧版安装包

应用代码不用重新下载，但旧包中的 service 仍是旧目录和监听配置。用下面的内容直接创建 /etc/systemd/system/no-see-bye.service，然后执行上面的 daemon-reload 和 enable --now（已运行则 restart）：

```ini
[Unit]
Description=No See Bye personal portal
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/no-see-bye
Environment=NODE_ENV=production
Environment=HOSTNAME=0.0.0.0
Environment=PORT=3000
EnvironmentFile=/root/no-see-bye/config.env
ExecStartPre=/root/no-see-bye/runtime/node /root/no-see-bye/scripts/check-runtime.mjs
ExecStartPre=/root/no-see-bye/runtime/node /root/no-see-bye/scripts/init-db.mjs
ExecStart=/root/no-see-bye/runtime/node /root/no-see-bye/server.js
Restart=on-failure
RestartSec=5
TimeoutStopSec=45
UMask=0077

[Install]
WantedBy=multi-user.target
```

## 数据与更新

配置保存在 config.env，数据库和原始媒体全部在 data/。更新前先 systemctl stop no-see-bye，备份这两项，再将新包解压覆盖程序文件，最后 systemctl start no-see-bye。发布包不包含 config.env 和 data/，不会覆盖这两项；不要删除整个应用目录。备份数据库前也要停止正在运行的附件清理任务。

附件清理可后续启用，新包中提供了可选 timer：

```bash
cp deploy/systemd/no-see-bye-cleanup.* /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now no-see-bye-cleanup.timer
```

若启用了清理定时器，备份/更新前一起停止 no-see-bye-cleanup.timer、no-see-bye-cleanup.service，完成后重新启动 timer。

Linux x64 包同时携带 Debian/Ubuntu 和 RHEL/Alibaba Cloud Linux 所需的 OpenSSL 1.1/3.0 Prisma 引擎，已在 Alibaba Cloud Linux 3 + OpenSSL 1.1 实机验证数据库连接。其他架构需要对应构建产物。当前部署使用 `https://tingjieli.shop` 和 `/root/certificate` 下的证书；80 和 443 均可访问；HTTP 为明文，建议使用 HTTPS。

## 本地注册与验证

注册填写用户名、密码和确认密码，两次密码一致后弹出随机加法验证；回答正确即创建账号并自动登录。不需要邮箱、手机号或短信服务配置。GitHub 登录继续保留。

题目由服务器随机生成，以图片显示，5 分钟有效、最多尝试 5 次，并绑定当前浏览器与用户名；成功注册后立即作废。注册与换题接口均有限流。这是轻量反自动化措施，不等同于能阻止高级机器人的风控服务。

`USER_QUOTA_MB=0` 表示不设个人总存储上限；单张照片 20 MB、单个视频 200 MB、头像 5 MB 的限制仍保留。
