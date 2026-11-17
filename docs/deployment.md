# root 用户直接部署

发布包已包含 Node 运行时。直接解压到 /root/no-see-bye，配置后用 systemd 启动，通过 https://tingjieli.shop 访问。以下命令用 root 执行。

## GitHub 合并后自动上线

`master` 更新后，GitHub Actions 依次完成构建、代码检查、发布包隔离测试和部署脚本回退测试，再将同一次构建的发布包上传到服务器。部署过程校验 SHA-256 与提交号，暂停应用和附件清理任务，备份后切换版本；本机健康检查失败时恢复上一版代码。最后检查公网 HTTPS 健康接口。

服务器固定使用 `/root/no-see-bye`，备份位于 `/root/no-see-bye-backups/<时间>-<提交号>/`，包含旧版程序和 `state.tar.gz`（数据库、媒体与配置）。部署保留当前 `data/`、`config.env` 和本地 `.env` 文件。代码回退保留当前数据，数据备份供需要时人工恢复。

GitHub 仓库已配置四个加密 Secrets：`DEPLOY_HOST`、`DEPLOY_USER`、`DEPLOY_SSH_KEY`、`DEPLOY_KNOWN_HOSTS`。部署使用独立 SSH 密钥，服务器 `authorized_keys` 将其限制为 `deploy/ci-receiver.sh`；该密钥不能执行其他命令、打开终端或转发端口。服务器密码不进入仓库或工作流。

手动重跑可在 GitHub Actions 的 **Linux deployment bundle** 中选择 `master` 运行。标签只生成安装包，不执行生产部署。部署脚本的成功、校验失败和健康检查失败回退由 `bash scripts/test-deploy.sh` 验证。

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
COOKIE_SECURE=true
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

## 管理员与密码安全

`/admin` 提供用户、活跃、记录、媒体与存储的只读概况，以及用户搜索、分页和每位用户的使用数据。管理员身份每次由服务器读取数据库核验；普通注册、个人资料和浏览器中的字段不能授予权限。后台不返回用户的私密正文、附件内容、密码哈希或会话凭据。活跃和登录次数从此功能上线后开始记录，不推算历史数据；趋势按北京时间统计。

首次创建管理员在服务器运行 `scripts/bootstrap-admin.mjs`，使用运行时环境变量 `ADMIN_USERNAME`、`ADMIN_EMAIL`、`ADMIN_BACKUP_EMAIL`，以及 `ADMIN_PASSWORD` 或成本为 12 的 `ADMIN_PASSWORD_HASH`。请从安全的运行环境传入凭据，不将真实密码写进仓库、发布包或命令文档。脚本已随发布包及运行依赖提供。

脚本需要先完成 `scripts/init-db.mjs`；既有管理员再次执行时保持原密码和邮箱，已有同名普通账号或联系邮箱冲突时拒绝创建，不会自动提权或覆盖。管理员主、备用邮箱均只登记为联系信息，未经验证码验证不会标为已验证。

本次按站点所有者要求暂不启用邮箱验证，默认 `PASSWORD_EMAIL_VERIFICATION=false`。修改本站密码仍须提供正确的当前密码，并通过原子更新撤销其余登录会话。

后续需要邮箱验证时，配置 `SMTP_HOST`、`SMTP_PORT`、`SMTP_SECURE`、`SMTP_USER`、`SMTP_PASSWORD`（邮箱的 SMTP 授权码）和可选的 `SMTP_FROM`，然后显式设置 `PASSWORD_EMAIL_VERIFICATION=true` 并重启。仅配置 SMTP 不会自动开启验证。开启后，验证码 10 分钟有效，最多尝试 5 次，重发间隔 60 秒；验证码绑定用户、会话版本、新密码和邮箱，成功后只能消费一次。未绑定邮箱的本地账号可在验证通过时绑定；第三方账号仍在相应平台管理密码。验证已开启但邮件服务不可用时，修改密码会被拒绝，不会绕过验证。

`npm run test:security` 使用独立数据库和本机 SMTP 测试收件箱验证权限、账户初始化、改密与验证码，不向真实用户邮箱发信。CI 在解压后的独立发布包上同时运行该测试和原有集成测试。
