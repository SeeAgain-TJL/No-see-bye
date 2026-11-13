# root 用户直接部署

发布包已包含 Node 运行时。直接解压到 /opt/no-see-bye，配置后用 systemd 启动，通过 http://你的EIP:3000 访问。以下命令用 root 执行。

## 1. 解压并加执行权限

在安装包所在目录执行：

```bash
mkdir -p /opt
tar -xzf no-see-bye-linux-x64.tar.gz -C /opt
cd /opt/no-see-bye
chmod +x runtime/node
```

## 2. 生成配置

只需将下面的 EIP 换成自己的公网 IP。密钥自动随机生成，数据库和上传目录首次启动自动创建。

```bash
EIP=你的公网IP
cat > config.env <<EOF
DATABASE_URL=file:/opt/no-see-bye/data/app.db
STORAGE_DRIVER=local
STORAGE_LOCAL_DIR=/opt/no-see-bye/data/uploads
JWT_SECRET=$(./runtime/node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
USER_QUOTA_MB=2048
ALLOW_REGISTRATION=true
APP_ORIGIN=http://$EIP:3000
COOKIE_SECURE=false
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

在阿里云 ECS 安全组放行 **TCP 3000**，服务器若启用了防火墙也放行 3000，然后浏览器打开 http://你的EIP:3000。EIP 只提供公网地址，仍需端口规则允许入站。

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
WorkingDirectory=/opt/no-see-bye
Environment=NODE_ENV=production
Environment=HOSTNAME=0.0.0.0
Environment=PORT=3000
EnvironmentFile=/opt/no-see-bye/config.env
ExecStartPre=/opt/no-see-bye/runtime/node /opt/no-see-bye/scripts/check-runtime.mjs
ExecStartPre=/opt/no-see-bye/runtime/node /opt/no-see-bye/scripts/init-db.mjs
ExecStart=/opt/no-see-bye/runtime/node /opt/no-see-bye/server.js
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

Linux x64 包同时携带 Debian/Ubuntu 和 RHEL/Alibaba Cloud Linux 所需的 OpenSSL 1.1/3.0 Prisma 引擎，已在 Alibaba Cloud Linux 3 + OpenSSL 1.1 实机验证数据库连接。其他架构需要对应构建产物。当前 HTTP 配置可直接用 EIP 验证功能；HTTP 下账号密码未加密传输，后续正式使用时再接入 HTTPS，并将 APP_ORIGIN 改为实际 HTTPS 来源、COOKIE_SECURE 改为 true。
