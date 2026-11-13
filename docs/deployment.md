# 阿里云 ECS：发布包 + systemd

应用直接运行在 Linux ECS，由 systemd 管理，无需容器、服务器端 npm 安装或现场编译。发布包内含 Next standalone 服务、静态资源、Prisma 原生引擎、维护脚本和 Node.js 24 可执行文件。它是带运行时的应用包，不是单个原生可执行文件。

默认构建目标是 **Ubuntu 22.04 / 24.04、x86_64、glibc、OpenSSL 3**。ARM/aarch64、Alpine/musl、旧版系统不能直接使用此包；需要在对应平台重新构建并验证。不要将 Windows 产物上传到 Linux。ECS 安装 ca-certificates、openssl 和 nginx；Node 已在包内。当前提供配置和验证流程，不会自动连接或部署云服务器。

## 1. 生成 Linux 发布包

推荐在 GitHub 仓库的 Actions → Linux deployment bundle 运行 workflow。master 推送、v* 标签也会触发。成功后下载 no-see-bye-linux-x64 artifact，解开外层 zip，获得 tar.gz 和 .sha256。此流程只构建和测试，不会连接 ECS；运行记录中的所有检查通过后再部署。

也可以在与 ECS 相同平台的 Linux 构建机运行：

```bash
npm ci
npm run db:generate
npm run lint
npm run build
npm run check
npm run release:pack

# 在仓库之外验证解压后的真实发布包，防止漏包被源码依赖掩盖。
bundle_dir=$(mktemp -d)
(cd dist && sha256sum -c no-see-bye-linux-x64.tar.gz.sha256)
tar -xzf dist/no-see-bye-linux-x64.tar.gz -C "$bundle_dir"
TEST_RELEASE_DIR="$bundle_dir/no-see-bye" npm run test:integration
rm -rf "$bundle_dir"
```

构建机需要 Node.js 24.18.0（CI 固定版本）、npm、tar、OpenSSL，以及访问 npm 和 GitHub 的网络。打包会取对应 Node 版本的许可证。产物在 dist/，按构建机平台/架构命名，并生成 SHA-256 校验文件及 release.json。包内不包含 .env、SQLite 数据文件和上传目录。升级 Node 安全版本时，同步修改 workflow 的版本并重新构建整个包。

## 2. ECS 目录与首次安装

目录约定：

```text
/opt/no-see-bye/releases/<版本>/  程序与其自带运行时，root 所有
/opt/no-see-bye/current          指向当前版本的符号链接
/etc/no-see-bye/environment      密钥与配置，root:root 0600
/var/lib/no-see-bye/app.db        SQLite（可能伴随 -wal、-shm）
/var/lib/no-see-bye/uploads/      私有照片和视频
/var/cache/no-see-bye/           可丢弃的 Next 缓存
```

将两个产物上传至 ECS 的 /tmp。以下示例在 Ubuntu 上运行，使用具有 sudo 权限的账户：

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates openssl nginx
cd /tmp
sha256sum -c no-see-bye-linux-x64.tar.gz.sha256

id no-see-bye >/dev/null 2>&1 || sudo useradd --system --user-group --home-dir /var/lib/no-see-bye --shell /usr/sbin/nologin no-see-bye
sudo install -d -m 0755 /opt/no-see-bye/releases
sudo install -d -m 0700 /etc/no-see-bye
sudo install -d -o no-see-bye -g no-see-bye -m 0700 /var/lib/no-see-bye /var/lib/no-see-bye/uploads /var/cache/no-see-bye

release_id=$(date -u +%Y%m%dT%H%M%SZ)
release_dir="/opt/no-see-bye/releases/$release_id"
sudo install -d -m 0755 "$release_dir"
sudo tar -xzf /tmp/no-see-bye-linux-x64.tar.gz -C "$release_dir" --strip-components=1
sudo chown -R root:root "$release_dir"
sudo ln -s /var/cache/no-see-bye "$release_dir/.next/cache"
sudo ln -s "$release_dir" /opt/no-see-bye/current

sudo install -m 0600 "$release_dir/deploy/environment.example" /etc/no-see-bye/environment
openssl rand -hex 48
sudoedit /etc/no-see-bye/environment
```

将随机值填入 JWT_SECRET，配置 APP_ORIGIN 为访问网站的真实来源（协议 + 域名 + 可选端口，不带末尾 /）。HTTPS 使用 COOKIE_SECURE=true；仅本机 HTTP 调试时设 false，并让 APP_ORIGIN 与访问地址完全一致。EnvironmentFile 使用 KEY=value 格式，不加 export。ALLOW_REGISTRATION=false 可关闭新用户注册。默认每个用户 2048 MiB，可按云盘容量调整 USER_QUOTA_MB。

如果已有数据，先停止旧服务，把旧数据库整套（含仍存在的 WAL/SHM）与上传目录迁至上述路径，并将数据所有者设为 no-see-bye。保留原 JWT_SECRET 可让现有登录会话继续有效。不要把已有库替换成空文件。

安装并启动服务：

```bash
sudo install -m 0644 "$release_dir"/deploy/systemd/no-see-bye* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now no-see-bye.service
curl --fail http://127.0.0.1:3000/api/health
sudo systemctl status no-see-bye.service
sudo systemctl enable --now no-see-bye-cleanup.timer
```

启动前校验配置和数据目录，再执行幂等数据库升级。失败时服务不进入可用状态，日志会说明原因。程序以 no-see-bye 用户运行，仅监听 127.0.0.1:3000。代码目录只读；只有持久化数据和缓存目录可写。运行时随应用版本升级，无需系统全局安装 Node。

## 3. Nginx 与 HTTPS

参考包内 deploy/nginx.conf。limit_req_zone 放在 http {} 作用域；Ubuntu 默认 sites-enabled 的 include 已在此作用域。替换域名，安装至 /etc/nginx/sites-available/no-see-bye，再链接到 sites-enabled。处理已有站点/默认站点的域名冲突，先验证配置：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

示例为 HTTP 起步配置。面向公网前配置域名证书、443 和 HTTP 到 HTTPS 的跳转，并同步 APP_ORIGIN、COOKIE_SECURE 后重启应用。ECS 安全组只开放网站需要的 80/443，不开放 3000。

上传限制为 201m，大于单视频 200 MiB；代理上传缓冲关闭，收发超时 300 秒。不要将 uploads 映射为 Nginx 静态目录，不要为 /api/assets/ 设置共享缓存。媒体授权与 Range 请求由应用处理。浏览器能否播放 MOV 仍取决于原视频编码。

## 4. 常用管理与附件清理

```bash
sudo systemctl restart no-see-bye
sudo systemctl stop no-see-bye
sudo systemctl start no-see-bye
sudo journalctl -u no-see-bye -n 100 --no-pager
sudo journalctl -u no-see-bye -f
curl --fail http://127.0.0.1:3000/api/health

sudo systemctl list-timers no-see-bye-cleanup.timer
sudo systemctl start no-see-bye-cleanup.service
sudo journalctl -u no-see-bye-cleanup.service -n 50 --no-pager
```

清理定时器在服务器本地时区每日 04:00 后的随机 15 分钟内运行，错过会补跑。每次最多删除 500 个超过 24 小时且没有关联记录的附件，不清空回收站。清理失败不终止主服务。进程崩溃残留的 .upload-* 临时文件暂需停机检查。

systemd 在异常退出后重启应用，60 秒内最多尝试 5 次，避免配置错误无限重启。修复原因后可执行 systemctl reset-failed no-see-bye，再启动。正常人工停止不会触发重启。HTTP 健康检查失败不会自动重启进程，可交给现有 ECS 监控系统告警。

## 5. 备份、升级和回退

先做一致备份，再切换新版本。SQLite WAL 模式下不要在运行中只复制 .db 文件；本方案停主服务和所有清理任务后，备份整套数据、密钥：

```bash
sudo systemctl stop no-see-bye-cleanup.timer
sudo systemctl stop no-see-bye-cleanup.service no-see-bye.service
sudo install -d -m 0700 /var/backups/no-see-bye
backup_file="/var/backups/no-see-bye/$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
sudo sh -c 'umask 077; tar -czf "$1" -C / var/lib/no-see-bye etc/no-see-bye/environment' sh "$backup_file"
# 如只做备份，此时启动应用与 timer；如做升级，继续以下步骤。
```

备份含密钥与私人媒体，应加密保存到独立云盘或另一台机器并定期演练恢复。缓存不用备份。更换密钥会使已有登录会话失效。

升级时先将新包与校验文件上传到 /tmp，校验后解压到全新的版本目录，保留旧目录。复用第 2 节 release_id/release_dir、install -d、tar、chown 和缓存 ln -s 步骤；**不要覆盖环境文件或数据，不重复创建已存在的 current 链接**。然后在同一 shell 中执行：

```bash
previous_release=$(readlink -f /opt/no-see-bye/current)
sudo ln -s "$release_dir" /opt/no-see-bye/current.next
sudo mv -Tf /opt/no-see-bye/current.next /opt/no-see-bye/current
sudo install -m 0644 "$release_dir"/deploy/systemd/no-see-bye* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start no-see-bye.service
curl --fail http://127.0.0.1:3000/api/health
sudo systemctl start no-see-bye-cleanup.timer
```

再检查登录、历史记录和媒体预览。切换前必须已停主服务与清理任务：这样数据库增量升级不会与旧版本并行运行。数据路径始终保持不变，旧版本目录可用于回退。

新版本启动失败时，检查 journal；若数据库结构与旧代码兼容，可以停止主服务与清理任务，将 current 切回 previous_release，重新安装旧版本 unit、daemon-reload 后启动。**代码回退不会撤销数据库升级**；不兼容时应停机，从升级前的整套备份恢复数据库、媒体、配置，恢复 no-see-bye 数据所有权后启动旧版。恢复会丢弃备份之后的数据，应核对备份时间。

单台 ECS 只运行一个应用进程，不启用多进程集群、不跨机器共享 SQLite。并发和容量增长后再迁移 PostgreSQL、共享对象存储和集中限流。当前会话在 Windows 验证本机发布包；Linux 原生依赖、systemd 与 Nginx 需以 GitHub Actions 和实际 ECS 的运行结果为准。
