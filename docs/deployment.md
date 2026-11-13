# 阿里云 ECS 部署

以下以 Linux ECS、Docker Compose 和 Nginx 为例。本次只生成配置，没有连接或修改云资源。

## 配置与启动

```bash
git clone https://github.com/SeeAgain-TJL/No-see-bye.git
cd No-see-bye
cp .env.example .env
mkdir -p data/uploads
sudo chown -R 1000:1000 data
openssl rand -hex 48
```

将随机输出填入 .env 的 JWT_SECRET。容器使用 UID/GID 1000 的非 root node 用户。正式站点设置 APP_ORIGIN=https://你的域名（不带结尾斜杠）和 COOKIE_SECURE=true。临时 HTTP 验证设实际 http 地址和 COOKIE_SECURE=false，不用真实密码做公网 HTTP 测试。

Compose 固定使用 /app/data/app.db 和 /app/data/uploads，并挂载 ./data。若原先用 prisma/dev.db，停机后迁移旧库和媒体，核对配置后再启动。

```bash
docker compose up -d --build
docker compose logs -f --tail=100 web
curl http://127.0.0.1:3000/api/health
```

启动会执行幂等增量数据库升级。服务只映射 ECS 的 127.0.0.1:3000。安全组对外只需网站的 80/443，不放行 3000。监控云盘剩余容量。

## Nginx 与 HTTPS

参考 deploy/nginx.conf。limit_req_zone 放在 http {}，server 中替换域名。示例为 HTTP 起步配置；公开使用前配置域名证书和 HTTPS/443，再将 HTTP 重定向到 HTTPS，并同步 APP_ORIGIN、COOKIE_SECURE。

上传限制大于 200 MiB，示例 201m；关闭上传请求代理缓冲，收发超时 300 秒。不要对 /api/assets/ 添加公开静态目录或共享缓存。保留 Range 和 Content-Range。浏览器能否播放 MOV 取决于视频编码。

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 更新与备份

先备份再更新。SQLite WAL 模式下，不要在运行中只复制 .db 文件。最简单的一致备份：停止应用，备份整个 data 目录（包括可能的 -wal/-shm）和单独安全保存的 .env，再恢复服务。

```bash
docker compose stop web
tar -czf ../no-see-bye-data-backup.tar.gz data
# 另行安全备份 .env，不放入公开目录或 Git。
docker compose start web
```

将备份复制到另一台机器或独立云盘，定期演练恢复。恢复时停应用，恢复整套数据库、媒体和密钥，校正 UID/GID 后启动。不能只恢复库或媒体其中一个。更新代码后 docker compose up -d --build；保留 data，不清空持久化卷。

## 清理和规模

```bash
docker compose exec web npm run assets:cleanup
```

每次最多处理 500 个超过 24 小时且没有关联记录的附件。回收站保留关联，不受影响；删除前锁定状态，防止与编辑保存竞争。正常取消/失败自动清除临时文件；进程崩溃遗留的 .upload-\* 暂需停机人工检查。

单台 ECS、一个应用进程，不开 PM2 cluster 或多个 web 副本，不跨主机共享 SQLite。扩容前迁移 PG、共享对象存储及集中限流。

Docker 配置尚未在本次 Windows 环境实际构建。Node 生产构建与独立数据库集成检查在本机执行。
